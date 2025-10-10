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


def clean_text(text):
    """Clean text from HTML artifacts and normalize whitespace"""
    if not text:
        return text
    # Remove zero-width spaces and other invisible characters
    text = text.replace('\u200b', '').replace('\ufeff', '')
    # Normalize whitespace
    text = ' '.join(text.split())
    # Remove common HTML artifacts
    text = text.replace('&nbsp;', ' ')
    return text.strip()

# --- Configuration and Selectors from the Advanced Scraper ---

QUESTION_PANEL_SELECTORS = [
    'div.question-panel',
    'div.questionView',
    'div.analysis-que-panel',
    'div[data-qa="question-panel"]',
    'div.qpanel',
    'div.qns-view',
    'div.solutions-question',
]
QUESTION_TEXT_SELECTORS = [
    '.qns-view-box',
    '[ng-bind-html^="getQuestionDesc"]',
    '.question-desc',
    '.que-txt-d',
    '.question-text',
    'div.qns-view-box',
]
OPTIONS_LIST_SELECTORS = [
    'li.option',
    'ul.quiz-options-list li',
    'ol.list-unstyled li',
    'ul.options li',
    'div.options-list li',
]
NEXT_BUTTON_SELECTORS = [
    'button[ng-click="navBtnPressed(true)"]',
    'button.next, button[title="Next"]',
    'button[aria-label="Next"]',
    'a.next-question',
]

LABEL_RE = re.compile(r'^\s*\(?([A-Za-z0-9])\)?[.:\)]\s*(.+)$', re.S)

# --- Helper Functions from the Advanced Scraper ---

def setup_driver(headless=True):
    from selenium.webdriver.chrome.options import Options
    options = Options()
    if headless:
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
    return driver

def _map_li_to_label(li, options_dict):
    text_full = li.get_text(' ', strip=True)
    m = LABEL_RE.match(text_full)
    if m:
        lbl = m.group(1).upper()
        if lbl in options_dict:
            return lbl
    for label, text in options_dict.items():
        if text and text in text_full:
            return label
    return None

def parse_question_fragment(question_panel):
    html = question_panel.get_attribute('innerHTML') or ''
    soup = BeautifulSoup(html, 'html.parser')

    question_elem = None
    for sel in QUESTION_TEXT_SELECTORS:
        question_elem = soup.select_one(sel)
        if question_elem:
            break

    question_html = question_elem.decode_contents().strip() if question_elem else ''
    question_text_plain = question_elem.get_text(' ', strip=True) if question_elem else ''
    
    options = {}
    option_nodes = []
    for sel in OPTIONS_LIST_SELECTORS:
        option_nodes = soup.select(sel)
        if option_nodes:
            break

    for idx, li in enumerate(option_nodes):
        # Try to find option label and content separately
        option_label_elem = li.select_one('.option-label')
        option_content_elem = li.select_one('.option-content')
        
        if option_label_elem and option_content_elem:
            # If structure is clear with separate label and content
            label = option_label_elem.get_text(strip=True).upper()
            opt_text = option_content_elem.get_text(' ', strip=True)
        else:
            # Fallback to your original parsing
            text_full = li.get_text(' ', strip=True)
            if not text_full:
                continue

            m = LABEL_RE.match(text_full)
            label = m.group(1).upper() if m and m.group(1) else chr(ord('A') + idx)
            opt_text = m.group(2).strip() if m else text_full
        
        # Clean up the option text - remove extra whitespace and unwanted characters
        opt_text = ' '.join(opt_text.split())  # Normalize whitespace
        opt_text = opt_text.replace('\u200b', '')  # Remove zero-width spaces
        
        options[label] = opt_text

    user_answer_label = None
    correct_answer_label = None

    for li in option_nodes:
        classes = ' '.join(li.get('class') or []).lower()
        if any(k in classes for k in ('correct-option', 'js-correct-answer')):
            correct_answer_label = _map_li_to_label(li, options)
        if any(k in classes for k in ('state-attempted', 'incorrect-option', 'user-answer')):
            user_answer_label = _map_li_to_label(li, options)

    summary_text = soup.get_text(' ', strip=True).lower()
    m_cor = re.search(r'correct option[:\s]*([a-z0-9])', summary_text, re.I)
    if m_cor and not correct_answer_label:
        correct_answer_label = m_cor.group(1).upper()
        
    user_answer = {'label': user_answer_label, 'text': options.get(user_answer_label)} if user_answer_label else None
    correct_answer = {'label': correct_answer_label, 'text': options.get(correct_answer_label)} if correct_answer_label else None

    return {
        'question_html': question_html,
        'question_text_plain': question_text_plain,
        'options': options,
        'user_answer': user_answer,
        'correct_answer': correct_answer,
    }


def screenshot_panel_save(question_panel, prefix='q'):
    filename = f"{prefix}_{int(time.time())}_{uuid.uuid4().hex[:8]}.png"
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
    try:
        question_panel.screenshot(filepath)
        return filename
    except Exception as e:
        print(f"Error taking screenshot: {e}")
        return None


# --- Main Scraper Function (Adapted for Flask with Debugging) ---

def scrape_testbook_data(cookies, url):
    print("🚀 Starting Testbook scraper...")
    driver = setup_driver(headless=True)
    new_mock_id = None
    
    def debug_save(driver, stage):
        print(f"🚨 DEBUG: Saving page source and screenshot at stage: {stage}")
        debug_folder = os.path.join(current_app.config['UPLOAD_FOLDER'], 'debug')
        os.makedirs(debug_folder, exist_ok=True)
        
        timestamp = time.strftime("%Y%m%d-%H%M%S")
        with open(os.path.join(debug_folder, f"debug_page_{stage}_{timestamp}.html"), "w", encoding="utf-8") as f:
            f.write(driver.page_source)
        driver.save_screenshot(os.path.join(debug_folder, f"debug_screenshot_{stage}_{timestamp}.png"))



    try:
        print("Navigating to URL and adding cookies...")
        driver.get(url)
        cookie_list = [cookie.strip() for cookie in cookies.split(';')]
        for cookie_str in cookie_list:
            if '=' in cookie_str:
                name, value = cookie_str.split('=', 1)
                driver.add_cookie({'name': name, 'value': value, 'domain': '.testbook.com'})
        driver.get(url)
        print("Cookies added, page reloaded.")

        try:
            print("Waiting for summary table...")
            WebDriverWait(driver, 30).until(EC.visibility_of_element_located((By.CSS_SELECTOR, "table.table-grid--summary tbody tr")))
            print("✅ Summary table found.")
        except Exception as e:
            print("❌ Timed out waiting for summary table.")
            debug_save(driver, "summary_table")
            raise e

        time.sleep(3)

        soup_summary = BeautifulSoup(driver.page_source, 'html.parser')
        mock_name_tag = soup_summary.select_one('.sticky-header__title .ng-binding')
        mock_name = mock_name_tag.text.strip() if mock_name_tag else "Testbook Mock"
        print(f"Mock name: {mock_name}")

        with current_app.app_context():
            score_container = soup_summary.find('div', class_='analysis-summary--score')
            score_text = score_container.find('h4').text.strip()
            overall_score = float(re.search(r"(\d+\.?\d*)", score_text).group(1))
            percentile_container = soup_summary.find('div', class_='analysis-summary--percentile')
            percentile_text = percentile_container.find('h4').text.strip()
            overall_percentile = float(re.search(r"(\d+\.?\d*)", percentile_text).group(1))
            tier = "Tier 2" if "Tier II" in mock_name or "Tier 2" in mock_name else "Tier 1"
            total_questions = 150 if tier == "Tier 2" else 100
            new_mock = Mock(name=mock_name, score_overall=overall_score, percentile_overall=overall_percentile, tier=tier)
            db.session.add(new_mock)
            db.session.commit()
            new_mock_id = new_mock.id
            print(f"New mock created with ID: {new_mock_id}")
        print("Waiting for solutions button...")
        solutions_button = WebDriverWait(driver, 20).until(EC.element_to_be_clickable((By.CSS_SELECTOR, "a.btn-outline-primary[href*='solutions']")))
        driver.execute_script("arguments[0].click();", solutions_button)
        print("✅ Solutions button clicked.")
        print("Waiting for detailed question view...")
        WebDriverWait(driver, 30).until(EC.visibility_of_element_located((By.CSS_SELECTOR, ".detailed-question")))
        print("✅ Detailed question view loaded.")
        time.sleep(3)

        with current_app.app_context():
            print(f"Starting to loop through {total_questions} questions...")
            for i in range(1, total_questions + 1):
                try:
                    print(f"Processing question {i}...")
                    question_panel = WebDriverWait(driver, 15).until(EC.visibility_of_element_located((By.CSS_SELECTOR, ".detailed-question")))
                    
                    soup_question = BeautifulSoup(driver.page_source, 'html.parser')
                    status_badge = soup_question.select_one(".tp-info .badge")
                    status = status_badge.text.strip() if status_badge else "Unattempted"
                    
                    if status in ['Incorrect', 'Unattempted', 'Wrong', 'Skipped']:
                        print(f"  - Status: {status}. Capturing mistake.")
                        parsed_data = parse_question_fragment(question_panel)
                        screenshot_filename = screenshot_panel_save(question_panel, prefix=f"q{i}")
                        
                        if screenshot_filename:
                            section_name = ""
                            if tier == "Tier 1":
                                active_section_tab = soup_question.select_one("#sectionNavTabs li.active a span.hidden-xs")
                                section_name = active_section_tab.text.strip() if active_section_tab else "Unknown Section"
                            elif tier == "Tier 2":
                                if 1 <= i <= 30: section_name = "Maths"
                                elif 31 <= i <= 60: section_name = "Reasoning"
                                elif 61 <= i <= 105: section_name = "English"
                                elif 106 <= i <= 130: section_name = "GK"
                                else: section_name = "Computer"

                            # 👇 THIS IS THE FIX 👇
                            # Extract the 'text' from the answer dictionary before cleaning
                            user_answer_text = parsed_data['user_answer']['text'] if parsed_data.get('user_answer') else None
                            correct_answer_text = parsed_data['correct_answer']['text'] if parsed_data.get('correct_answer') else None

                            new_mistake = Mistake(
                                mock_id=new_mock_id, 
                                image_path=screenshot_filename, 
                                section_name=section_name, 
                                question_type='Incorrect' if status in ['Incorrect', 'Wrong'] else 'Unattempted',
                                question_text=clean_text(parsed_data['question_text_plain']),
                                options={k: clean_text(v) for k, v in parsed_data['options'].items()},
                                user_answer=clean_text(user_answer_text),
                                correct_answer=clean_text(correct_answer_text),
                                tier=tier
                            )
                            db.session.add(new_mistake)
                            print("  - Mistake added to session.")

                    if i < total_questions:
                        try:
                            next_button = WebDriverWait(driver, 10).until(EC.element_to_be_clickable((By.CSS_SELECTOR, 'button[ng-click="navBtnPressed(true)"]')))
                            driver.execute_script("arguments[0].click();", next_button)
                            print(f"  - Navigating to question {i+1}...")
                            time.sleep(1)
                        except Exception as e:
                            print(f"  - ❌ Could not find or click next button for question {i+1}.")
                            debug_save(driver, f"next_button_q{i+1}")
                            raise e
                
                except Exception as e:
                    print(f"Error processing question {i}: {e}")
                    debug_save(driver, f"processing_q{i}")
                    continue
            
            print("Committing all mistakes to the database...")
            db.session.commit()
            print("✅ Database commit successful.")
    
    except Exception as e:
        print(f"An error occurred during scraping: {e}")
        if new_mock_id:
            with current_app.app_context():
                db.session.rollback() # Clean up if something went wrong
        return None
    finally:
        print("Closing the browser.")
        driver.quit()

    return new_mock_id