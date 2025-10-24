"""
Email Service for Mentora
Handles sending password reset codes and other notifications
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class EmailService:
    """
    Email service for sending emails via SMTP
    Supports Gmail, Outlook, and custom SMTP servers
    """
    
    def __init__(
        self,
        smtp_host: str,
        smtp_port: int,
        smtp_user: str,
        smtp_password: str,
        from_email: str,
        from_name: str = "Mentora",
        use_tls: bool = True
    ):
        self.smtp_host = smtp_host
        self.smtp_port = smtp_port
        self.smtp_user = smtp_user
        self.smtp_password = smtp_password
        self.from_email = from_email
        self.from_name = from_name
        self.use_tls = use_tls
    
    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """
        Send an email
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: HTML version of email body
            text_content: Plain text version (optional)
            
        Returns:
            bool: True if sent successfully, False otherwise
        """
        try:
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"{self.from_name} <{self.from_email}>"
            message["To"] = to_email
            
            # Add text and HTML parts
            if text_content:
                part1 = MIMEText(text_content, "plain")
                message.attach(part1)
            
            part2 = MIMEText(html_content, "html")
            message.attach(part2)
            
            # Send email
            if self.use_tls:
                # Use TLS (most common - Gmail, Outlook, etc.)
                print(f"📧 Connecting to {self.smtp_host}:{self.smtp_port}")
                with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                    print(f"🔐 Starting TLS...")
                    server.starttls()
                    print(f"🔑 Logging in as {self.smtp_user}...")
                    server.login(self.smtp_user, self.smtp_password)
                    print(f"📨 Sending message to {to_email}...")
                    server.send_message(message)
                    print(f"✅ Message sent!")
            else:
                # Use SSL
                with smtplib.SMTP_SSL(self.smtp_host, self.smtp_port) as server:
                    server.login(self.smtp_user, self.smtp_password)
                    server.send_message(message)
            
            logger.info(f"Email sent successfully to {to_email}")
            print(f"✅ Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            print(f"❌ Failed to send email to {to_email}: {str(e)}")
            return False
    
    def send_password_reset_email(self, to_email: str, reset_code: str, username: str = "User") -> bool:
        """
        Send password reset code email
        
        Args:
            to_email: User's email address
            reset_code: 6-digit reset code
            username: User's name (optional)
            
        Returns:
            bool: True if sent successfully
        """
        subject = "Your Mentora Password Reset Code"
        
        # Plain text version
        text_content = f"""
Hello {username},

You requested to reset your password for your Mentora account.

Your password reset code is: {reset_code}

This code will expire in 15 minutes.

If you didn't request this password reset, please ignore this email.

Best regards,
The Mentora Team
        """
        
        # HTML version (styled)
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f5f5f5;
            margin: 0;
            padding: 20px;
        }}
        .container {{
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }}
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 20px;
            text-align: center;
        }}
        .header h1 {{
            margin: 0;
            font-size: 28px;
        }}
        .content {{
            padding: 40px 30px;
        }}
        .code-box {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 8px;
            padding: 20px;
            text-align: center;
            border-radius: 8px;
            margin: 30px 0;
            font-family: 'Courier New', monospace;
        }}
        .warning {{
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }}
        .footer {{
            text-align: center;
            padding: 20px;
            background-color: #f8f9fa;
            color: #6c757d;
            font-size: 14px;
        }}
        p {{
            line-height: 1.6;
            color: #333;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎓 Mentora</h1>
            <p>Password Reset Request</p>
        </div>
        <div class="content">
            <p>Hello <strong>{username}</strong>,</p>
            <p>You requested to reset your password for your Mentora account.</p>
            <p>Your password reset code is:</p>
            
            <div class="code-box">
                {reset_code}
            </div>
            
            <div class="warning">
                <strong>⏰ Important:</strong> This code will expire in <strong>15 minutes</strong>.
            </div>
            
            <p>Enter this code on the password reset page to continue.</p>
            <p>If you didn't request this password reset, please ignore this email and your password will remain unchanged.</p>
        </div>
        <div class="footer">
            <p>This is an automated message from Mentora - AI Study Assistant</p>
            <p>&copy; 2025 Mentora. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        """
        
        return self.send_email(to_email, subject, html_content, text_content)


def get_email_service(settings) -> Optional[EmailService]:
    """
    Create email service instance from settings
    Returns None if email is not configured
    """
    if not all([
        settings.SMTP_HOST,
        settings.SMTP_PORT,
        settings.SMTP_USER,
        settings.SMTP_PASSWORD,
        settings.FROM_EMAIL
    ]):
        logger.warning("Email service not configured - missing SMTP settings")
        return None
    
    return EmailService(
        smtp_host=settings.SMTP_HOST,
        smtp_port=settings.SMTP_PORT,
        smtp_user=settings.SMTP_USER,
        smtp_password=settings.SMTP_PASSWORD,
        from_email=settings.FROM_EMAIL,
        from_name=settings.FROM_NAME,
        use_tls=settings.SMTP_USE_TLS
    )
