#!/usr/bin/env python3
"""
Google Gemini API Test Script
Checks if the API key is working and has available quota
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_google_api():
    api_key = os.getenv('GOOGLE_API_KEY')
    
    if not api_key:
        print("❌ No GOOGLE_API_KEY found in environment")
        return False
    
    print(f"✅ API Key found: {api_key[:20]}...")
    
    try:
        import google.generativeai as genai
        
        # Configure the API
        genai.configure(api_key=api_key)
        
        # Test with a simple request
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content('Test message - respond with OK')
        
        print(f"✅ API Response: {response.text}")
        return True
        
    except Exception as e:
        error_msg = str(e)
        if "429" in error_msg or "quota" in error_msg.lower():
            print("❌ QUOTA EXCEEDED - You need to:")
            print("   1. Check your Google Cloud billing")
            print("   2. Upgrade from free tier")
            print("   3. Or wait for quota reset")
            print("   4. Visit: https://console.cloud.google.com/billing")
        elif "403" in error_msg:
            print("❌ API Key invalid or API not enabled")
        else:
            print(f"❌ API Error: {error_msg}")
        return False

if __name__ == "__main__":
    print("🔍 Testing Google Gemini API...")
    test_google_api()
