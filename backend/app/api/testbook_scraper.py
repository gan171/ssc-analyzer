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
        # 1. Scrape Summary and Create Mock
        driver.get(url) # Go to the analysis URL directly
        cookie_list = [cookie.strip() for cookie in cookies.split(';')]
        for cookie_str in cookie_list:
            if '=' in cookie_str:
                name, value = cookie_str.split('=', 1)
                driver.add_cookie({'name': name, 'value': value, 'domain': '.testbook.com'})
        driver.get(url) # Refresh the page with cookies

        WebDriverWait(driver, 30).until(EC.visibility_of_element_located((By.CSS_SELECTOR, "table.table-grid--summary tbody tr")))
        time.sleep(3)
        soup_summary = BeautifulSoup(driver.page_source, 'html.parser')
        
        with current_app.app_context():
            # Scrape summary data
            mock_name_tag = soup_summary.find('div', class_='d-none d-md-block')
            mock_name = mock_name_tag.text.strip() if mock_name_tag else "Testbook Mock"
            score_container = soup_summary.find('div', class_='analysis-summary--score')
            score_text = score_container.find('h4').text.strip()
            overall_score = float(re.search(r"(\d+\.?\d*)", score_text).group(1))
            percentile_container = soup_summary.find('div', class_='analysis-summary--percentile')
            percentile_text = percentile_container.find('h4').text.strip()
            overall_percentile = float(re.search(r"(\d+\.?\d*)", percentile_text).group(1))

            # Create Mock and Sections in DB
            new_mock = Mock(name=mock_name, score_overall=overall_score, percentile_overall=overall_percentile)
            db.session.add(new_mock)
            db.session.flush()
            new_mock_id = new_mock.id
            section_table = soup_summary.find('table', class_='table-grid--summary')
            section_rows = section_table.find('tbody').find_all('tr')
            for row in section_rows:
                cols = row.find_all('td')
                if not cols or 'Overall' in cols[0].text.strip(): continue
                section_name = cols[0].text.strip()
                score_raw = cols[1].find('div', class_='ng-binding').text.strip()
                section_score = float(re.search(r"(\d+\.?\d*)", score_raw).group(1))
                attempted_raw = cols[2].find('div', class_='ng-binding').text.strip()
                attempted_count = int(re.search(r"(\d+)", attempted_raw).group(1))
                accuracy_raw = cols[3].find('div', class_='value').text.strip()
                accuracy = float(re.search(r"(\d+\.?\d*)", accuracy_raw).group(1))
                correct_count = round((accuracy * attempted_count) / 100)
                incorrect_count = attempted_count - correct_count
                unattempted_count = 25 - attempted_count
                time_str = cols[4].find('div', class_='ng-binding').text.strip().split('/')[0].strip()
                minutes, seconds = map(int, time_str.split(':'))
                time_taken_seconds = (minutes * 60) + seconds
                new_section = Section(mock_id=new_mock_id, name=section_name, score=section_score, correct_count=correct_count, incorrect_count=incorrect_count, unattempted_count=unattempted_count, time_taken_seconds=time_taken_seconds)
                db.session.add(new_section)
            db.session.commit()

        # 2. Navigate to Solutions Page
        solutions_button = WebDriverWait(driver, 20).until(EC.element_to_be_clickable((By.CSS_SELECTOR, "a.btn-outline-primary[href*='solutions']")))
        driver.execute_script("arguments[0].click();", solutions_button)
        WebDriverWait(driver, 30).until(EC.visibility_of_element_located((By.ID, "mainBox")))
        time.sleep(3)

        # 3. Loop Through Questions and Screenshot Mistakes
        with current_app.app_context():
            total_questions = 100
            for i in range(1, total_questions + 1):
                try:
                    print(f"Processing Question #{i}...")
                    
                    # Wait for the question panel to be stable and visible
                    question_panel_locator = (By.CSS_SELECTOR, ".detailed-question")
                    question_panel = WebDriverWait(driver, 15).until(EC.visibility_of_element_located(question_panel_locator))
                    
                    # Store current question text to detect change
                    current_question_text = question_panel.text
                    
                    soup_question = BeautifulSoup(driver.page_source, 'html.parser')
                    
                    # More reliable selectors for status and section
                    status_badge = soup_question.select_one(".tp-info .badge")
                    status = status_badge.text.strip() if status_badge else "Unattempted"
                    
                    active_section_tab = soup_question.select_one("#sectionNavTabs li.active a span.hidden-xs")
                    section_name = active_section_tab.text.strip() if active_section_tab else "Unknown Section"

                    print(f"Details: Q{i}, Status: {status}, Section: {section_name}")

                    # Updated condition to include 'Skipped' and 'Unattempted'
                    if status in ['Incorrect', 'Unattempted', 'Wrong', 'Skipped']:
                        filename = f"mistake_{new_mock_id}_{i}_{uuid.uuid4()}.png"
                        filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
                        question_panel.screenshot(filepath)
                        
                        mistake_status = status if status != 'Skipped' else 'Unattempted'
                        new_mistake = Mistake(mock_id=new_mock_id, image_path=filename, section_name=section_name, question_type=mistake_status)
                        db.session.add(new_mistake)
                        db.session.commit()

                    if i < total_questions:
                        next_button_locator = (By.CSS_SELECTOR, 'button[ng-click="navBtnPressed(true)"]')
                        next_button = WebDriverWait(driver, 10).until(EC.element_to_be_clickable(next_button_locator))
                        
                        # Use JavaScript to click the button for reliability
                        driver.execute_script("arguments[0].click();", next_button)

                        # Wait for the question panel to update with new content
                        WebDriverWait(driver, 15).until(
                            lambda driver: driver.find_element(*question_panel_locator).text != current_question_text
                        )
                        print(f"Successfully navigated to the next question.")

                except Exception as loop_error:
                    print(f"Stopping at question #{i}. Assumed end of test. Error: {loop_error}")
                    driver.save_screenshot(os.path.join(current_app.config['UPLOAD_FOLDER'], f'error_at_question_{i}.png'))
                    break
    finally:
        driver.quit()

    return new_mock_id