from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
import re
import time
import os
import uuid
from app.extensions import db
from app.models.mock import Mock
from app.models.section import Section
from app.models.mistake import Mistake
from flask import current_app
from selenium.webdriver.common.by import By
from selenium.common.exceptions import TimeoutException


def scrape_testbook_data(cookies, url):
    options = webdriver.ChromeOptions()
    options.add_argument('--headless=new')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument("--window-size=1920,1200")
    options.add_argument('--disable-blink-features=AutomationControlled')
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option('useAutomationExtension', False)
    options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36")

    driver = webdriver.Chrome(service=ChromeService(ChromeDriverManager().install()), options=options)
    driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
    
    new_mock_id = None
    try:
        # 1. Navigate and add cookies
        driver.get(url)
        cookie_list = [cookie.strip() for cookie in cookies.split(';')]
        for cookie_str in cookie_list:
            if '=' in cookie_str:
                name, value = cookie_str.split('=', 1)
                driver.add_cookie({'name': name, 'value': value, 'domain': '.testbook.com'})
        driver.get(url)

        # Wait for Angular to render the page
        WebDriverWait(driver, 30).until(EC.visibility_of_element_located((By.CSS_SELECTOR, "table.table-grid--summary tbody tr")))
        time.sleep(3)  # Additional buffer for Angular
        
        # Wait specifically for the mock name element
        try:
            mock_name_element = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, ".sticky-header__title .d-md-block.ng-binding"))
            )
            mock_name = mock_name_element.text.strip()
        except:
            # Fallback: try mobile selector
            try:
                mock_name_element = WebDriverWait(driver, 5).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, ".sticky-header__title .d-block.d-md-none .ng-binding"))
                )
                mock_name = mock_name_element.text.strip()
            except:
                mock_name = None
        
        # If still no name, use BeautifulSoup as last resort
        if not mock_name:
            soup_summary = BeautifulSoup(driver.page_source, 'html.parser')
            mock_name_tag = soup_summary.select_one('.sticky-header__title .ng-binding')
            mock_name = mock_name_tag.text.strip() if mock_name_tag else "Testbook Mock"
        
        print(f"Scraped mock name: {mock_name}")
        
        # Parse the page for score/percentile
        soup_summary = BeautifulSoup(driver.page_source, 'html.parser')
        
        with current_app.app_context():
            score_container = soup_summary.find('div', class_='analysis-summary--score')
            if not score_container:
                raise ValueError("Could not find score container on page")
            score_text = score_container.find('h4').text.strip()
            overall_score = float(re.search(r"(\d+\.?\d*)", score_text).group(1))
            
            percentile_container = soup_summary.find('div', class_='analysis-summary--percentile')
            if not percentile_container:
                raise ValueError("Could not find percentile container on page")
            percentile_text = percentile_container.find('h4').text.strip()
            overall_percentile = float(re.search(r"(\d+\.?\d*)", percentile_text).group(1))

            # Determine tier from mock name
            tier = None
            total_questions = 0
            if "Tier II" in mock_name or "Tier 2" in mock_name:
                tier = "Tier 2"
                total_questions = 150
            elif "Tier I" in mock_name or "Tier 1" in mock_name:
                tier = "Tier 1"
                total_questions = 100
            else:
                raise ValueError(f"Could not determine exam tier from mock name: '{mock_name}'")

            new_mock = Mock(name=mock_name, score_overall=overall_score, percentile_overall=overall_percentile, tier=tier)
            db.session.add(new_mock)
            db.session.commit()
            new_mock_id = new_mock.id
            print(f"Created mock with ID: {new_mock_id}, Tier: {tier}")

        # 2. Navigate to Solutions Page
        solutions_button = WebDriverWait(driver, 20).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "a.btn-outline-primary[href*='solutions']"))
        )
        driver.execute_script("arguments[0].click();", solutions_button)
        WebDriverWait(driver, 30).until(EC.visibility_of_element_located((By.ID, "mainBox")))
        time.sleep(3)

        # 3. Loop Through Questions
        question_data = []
        with current_app.app_context():
            for i in range(1, total_questions + 1):
                try:
                    print(f"Processing Question #{i}...")
                    
                    question_panel_locator = (By.CSS_SELECTOR, ".detailed-question")
                    question_panel = WebDriverWait(driver, 15).until(
                        EC.visibility_of_element_located(question_panel_locator)
                    )
                    # This XPath is precise and should be very reliable.
                    time_span_xpath = "//span[text()='You:']/following-sibling::span"
                    
                    time_spent_seconds = 0
                    try:
                        # Wait up to 5 seconds for the text to be anything OTHER THAN "00:00"
                        WebDriverWait(driver, 5).until(
                            lambda d: d.find_element(By.XPATH, time_span_xpath).text.strip() != "00:00"
                        )
                        
                        # Once the wait is successful, grab the new text
                        time_spent_element = driver.find_element(By.XPATH, time_span_xpath)
                        time_spent_str = time_spent_element.text.strip()
                        
                        # Parse the "MM:SS" format
                        parts = time_spent_str.split(':')
                        if len(parts) == 2:
                            minutes = int(parts[0])
                            seconds = int(parts[1])
                            time_spent_seconds = (minutes * 60) + seconds
                        else:
                            # Fallback for just seconds like "25s" (good to have just in case)
                            match = re.search(r'(\d+)', time_spent_str)
                            if match:
                                time_spent_seconds = int(match.group(1))

                    except TimeoutException:
                        # If the time is still "00:00" after 5 seconds (likely an unattempted question)
                        print(f"Warning: Time for Q#{i} remained '00:00'. Assuming unattempted (0s).")
                        time_spent_seconds = 0
                    except Exception as e:
                        # Catch any other errors during parsing
                        print(f"Error finding or parsing time for Q#{i}: {e}")
                        time_spent_seconds = 0

                    # --- END OF FINAL LOGIC ---
                    
                    current_question_text = question_panel.text
                    soup_question = BeautifulSoup(driver.page_source, 'html.parser')
                    
                    status_badge = soup_question.select_one(".tp-info .badge")
                    status = status_badge.text.strip() if status_badge else "Unattempted"

                    section_name = ""
                    if tier == "Tier 1":
                        active_section_tab = soup_question.select_one("#sectionNavTabs li.active a span.hidden-xs")
                        section_name = active_section_tab.text.strip() if active_section_tab else "Unknown Section"
                    elif tier == "Tier 2":
                        if 1 <= i <= 30:
                            section_name = "Maths"
                        elif 31 <= i <= 60:
                            section_name = "Reasoning"
                        elif 61 <= i <= 105:
                            section_name = "English"
                        elif 106 <= i <= 130:
                            section_name = "GK"
                        elif 131 <= i <= 150:
                            section_name = "Computer"

                    question_data.append({
                        "question_number": i,
                        "status": status,
                        "section": section_name,
                        "time_spent": time_spent_seconds
                    })

                    print(f"Details: Q{i}, Status: {status}, Section: {section_name}, Time: {time_spent_seconds}s")

                    if status in ['Incorrect', 'Unattempted', 'Wrong', 'Skipped']:
                        # --- NEW EXTRACTION LOGIC STARTS HERE ---
                        options_data = {}
                        user_answer_text = None
                        correct_answer_text = None

                        options_list = soup_question.select('ul.quiz-options-list li.quiz-options-list-item')
                        
                        for option_li in options_list:
                            option_label_tag = option_li.select_one('.option-label')
                            option_text_tag = option_li.select_one('.option-text')

                            if option_label_tag and option_text_tag:
                                option_label = option_label_tag.text.strip()
                                option_text = option_text_tag.text.strip()
                                full_option_text = f"{option_label} {option_text}"
                                
                                options_data[option_label.replace('.', '')] = option_text
                                
                                if 'js-correct-answer' in option_li.get('class', []):
                                    correct_answer_text = full_option_text
                                
                                if 'state-attempted' in option_li.get('class', []):
                                    user_answer_text = full_option_text
                        # --- NEW EXTRACTION LOGIC ENDS HERE ---
                        filename = f"mistake_{new_mock_id}_{i}_{uuid.uuid4()}.png"
                        filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
                        question_panel.screenshot(filepath)
                        mistake_status = 'Incorrect' if status in ['Incorrect', 'Wrong'] else 'Unattempted'
                        
                        new_mistake = Mistake(
                            mock_id=new_mock_id, 
                            image_path=filename, 
                            section_name=section_name, 
                            question_type=mistake_status,
                            question_text=current_question_text,
                            options=options_data,
                            user_answer=user_answer_text,
                            correct_answer=correct_answer_text,
                            tier=tier
                        )
                        db.session.add(new_mistake)
                        db.session.commit()

                    if i < total_questions:
                        next_button_locator = (By.CSS_SELECTOR, 'button[ng-click="navBtnPressed(true)"]')
                        next_button = WebDriverWait(driver, 10).until(
                            EC.element_to_be_clickable(next_button_locator)
                        )
                        driver.execute_script("arguments[0].click();", next_button)
                        WebDriverWait(driver, 15).until(
                            lambda driver: driver.find_element(*question_panel_locator).text != current_question_text
                        )

                except Exception as loop_error:
                    print(f"Error at question #{i}: {loop_error}")
                    driver.save_screenshot(os.path.join(current_app.config['UPLOAD_FOLDER'], f'error_at_question_{i}.png'))
                    break
        
        # 4. Process collected data and create sections
        with current_app.app_context():
            sections = {}
            if tier == "Tier 2":
                sections = {
                    "Maths": {"correct": 0, "incorrect": 0, "unattempted": 0, "time": 0, "total": 30},
                    "Reasoning": {"correct": 0, "incorrect": 0, "unattempted": 0, "time": 0, "total": 30},
                    "English": {"correct": 0, "incorrect": 0, "unattempted": 0, "time": 0, "total": 45},
                    "GK": {"correct": 0, "incorrect": 0, "unattempted": 0, "time": 0, "total": 25},
                    "Computer": {"correct": 0, "incorrect": 0, "unattempted": 0, "time": 0, "total": 20},
                }

            for data in question_data:
                section = data["section"]
                if section not in sections:
                    sections[section] = {"correct": 0, "incorrect": 0, "unattempted": 0, "time": 0, "total": 25 if tier == "Tier 1" else 0}

                if data["status"] == "Correct":
                    sections[section]["correct"] += 1
                elif data["status"] in ["Incorrect", "Wrong"]:
                    sections[section]["incorrect"] += 1
                else:
                    sections[section]["unattempted"] += 1
                sections[section]["time"] += data["time_spent"]
            
            for name, data in sections.items():
                score = (data["correct"] * 3) - (data["incorrect"] * 1)
                if tier == "Tier 1":
                    attempted = data["correct"] + data["incorrect"]
                    data["unattempted"] = sections[name]["total"] - attempted

                new_section = Section(
                    mock_id=new_mock_id, 
                    name=name, 
                    score=score, 
                    correct_count=data["correct"], 
                    incorrect_count=data["incorrect"], 
                    unattempted_count=data["unattempted"], 
                    time_taken_seconds=data["time"]
                )
                db.session.add(new_section)
            db.session.commit()

    except Exception as e:
        print(f"An error occurred: {e}")
        if new_mock_id:
            with current_app.app_context():
                db.session.rollback()
        return None
    finally:
        driver.quit()

    return new_mock_id