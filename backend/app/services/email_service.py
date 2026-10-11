import smtplib
import socket
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Tuple
from datetime import datetime

from app.core.config import settings

logger = logging.getLogger(__name__)


def is_smtp_configured() -> bool:
    """Returns True if minimum required SMTP settings are configured."""
    return bool(settings.SMTP_HOST and settings.SMTP_HOST.strip())


def get_role_display_name(role: str) -> str:
    """Format role code into a user-friendly title."""
    mapping = {
        "ORG_ADMIN": "Organization Administrator",
        "ADMIN": "Administrator",
        "MANAGER": "Finance Manager",
        "ACCOUNTANT": "Accountant",
        "REVIEWER": "Financial Reviewer (Checker)"
    }
    return mapping.get((role or "").upper().strip(), role.replace("_", " ").title())


def get_role_description(role: str) -> str:
    """Brief description of the assigned role's scope."""
    mapping = {
        "ORG_ADMIN": "Full administrative governance over company workspace, team access, and statutory configurations.",
        "ADMIN": "Full administrative control across all operating ledgers and financial modules.",
        "MANAGER": "Period closing, approval of transactions, and statutory financial reporting.",
        "ACCOUNTANT": "Day-to-day transaction recording, bank reconciliation, and general ledger postings.",
        "REVIEWER": "Supervisory review and sign-off on journal vouchers and closing tasks."
    }
    return mapping.get((role or "").upper().strip(), "Authorized financial workspace member.")


def generate_invitation_text(
    recipient_email: str,
    company_name: str,
    role: str,
    invite_url: str,
    inviter_name: Optional[str] = None,
    expires_at: Optional[datetime] = None
) -> str:
    """Plain-text version of team invitation email."""
    inviter_text = f"{inviter_name} has" if inviter_name else "Your company administrator has"
    role_title = get_role_display_name(role)
    expiry_str = expires_at.strftime('%B %d, %Y') if expires_at else "in 7 days"

    return f"""Hello,

{inviter_text} invited you to join the financial workspace of {company_name} on RicozBooks.

Assigned Role: {role_title}
Workspace: {company_name}
Invitation Expiry: {expiry_str}

To accept your invitation and activate your account, open the link below in your browser:
{invite_url}

If you already have a RicozBooks account, signing in through this link will link your existing account to {company_name}.
If you are new to RicozBooks, you will be prompted to set your password and access your workspace.

If you were not expecting this invitation, please contact your administrator or ignore this email.

Best regards,
The RicozBooks Team
https://ricozbooks.com
"""


def generate_invitation_html(
    recipient_email: str,
    company_name: str,
    role: str,
    invite_url: str,
    inviter_name: Optional[str] = None,
    expires_at: Optional[datetime] = None
) -> str:
    """High-quality, RicozBooks-branded HTML email for workspace invitations."""
    inviter_text = f"<strong>{inviter_name}</strong> has" if inviter_name else "Your company administrator has"
    role_title = get_role_display_name(role)
    role_desc = get_role_description(role)
    expiry_str = expires_at.strftime('%B %d, %Y at %H:%M UTC') if expires_at else "7 days from today"

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation to join {company_name} on RicozBooks</title>
  <style>
    body {{
      margin: 0;
      padding: 0;
      background-color: #F8FAFC;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1E293B;
      line-height: 1.6;
    }}
    .email-container {{
      max-width: 600px;
      margin: 32px auto;
      background-color: #FFFFFF;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
      border: 1px solid #E2E8F0;
    }}
    .email-header {{
      background: linear-gradient(135deg, #260002 0%, #390003 50%, #781019 100%);
      padding: 32px 36px;
      color: #FFFFFF;
      text-align: left;
      border-bottom: 2px solid #C58B3E;
    }}
    .brand-title {{
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin: 0;
      color: #FFFFFF;
    }}
    .brand-title span {{
      color: #E6B676;
    }}
    .brand-subtitle {{
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #EEC68B;
      margin-top: 4px;
      font-weight: 600;
    }}
    .email-body {{
      padding: 36px;
    }}
    .invitation-badge {{
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      background-color: #FEF3C7;
      color: #92400E;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 16px;
      border: 1px solid #FDE68A;
    }}
    h1 {{
      font-size: 20px;
      font-weight: 700;
      color: #0F172A;
      margin: 0 0 16px 0;
      line-height: 1.3;
    }}
    p {{
      font-size: 14px;
      color: #475569;
      margin: 0 0 18px 0;
    }}
    .card-role {{
      background-color: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-left: 4px solid #781019;
      border-radius: 12px;
      padding: 16px 20px;
      margin: 24px 0;
    }}
    .card-role-title {{
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748B;
      margin-bottom: 4px;
    }}
    .card-role-name {{
      font-size: 16px;
      font-weight: 700;
      color: #0F172A;
    }}
    .card-role-desc {{
      font-size: 12px;
      color: #64748B;
      margin-top: 4px;
    }}
    .btn-container {{
      text-align: center;
      margin: 32px 0;
    }}
    .btn-accept {{
      display: inline-block;
      background: linear-gradient(135deg, #781019 0%, #260002 100%);
      color: #FFFFFF !important;
      text-decoration: none;
      padding: 14px 36px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.2px;
      box-shadow: 0 4px 14px rgba(120, 16, 25, 0.3);
      border: 1px solid #C58B3E;
    }}
    .btn-accept:hover {{
      background: #390003;
    }}
    .fallback-box {{
      background-color: #F1F5F9;
      border-radius: 8px;
      padding: 12px 16px;
      margin-top: 24px;
      font-size: 11px;
      color: #64748B;
      word-break: break-all;
    }}
    .fallback-box a {{
      color: #781019;
      text-decoration: none;
      font-weight: 600;
    }}
    .notice-box {{
      font-size: 12px;
      color: #94A3B8;
      border-top: 1px solid #F1F5F9;
      padding-top: 20px;
      margin-top: 24px;
    }}
    .email-footer {{
      background-color: #F8FAFC;
      padding: 24px 36px;
      border-top: 1px solid #E2E8F0;
      text-align: center;
      font-size: 11px;
      color: #94A3B8;
    }}
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <div class="brand-title">Ricoz<span>Books</span></div>
      <div class="brand-subtitle">Enterprise Accounting & Finance Workspace</div>
    </div>
    
    <div class="email-body">
      <div class="invitation-badge">Team Invitation</div>
      <h1>Join {company_name} on RicozBooks</h1>
      
      <p>Hello,</p>
      <p>
        {inviter_text} invited you to collaborate in the official finance workspace of 
        <strong>{company_name}</strong> on RicozBooks.
      </p>

      <div class="card-role">
        <div class="card-role-title">Assigned Role</div>
        <div class="card-role-name">{role_title}</div>
        <div class="card-role-desc">{role_desc}</div>
      </div>

      <div class="btn-container">
        <a href="{invite_url}" target="_blank" class="btn-accept">
          Accept Invitation & Launch Workspace &rarr;
        </a>
      </div>

      <p style="font-size: 13px; color: #64748B;">
        This invitation is valid until <strong>{expiry_str}</strong>. 
        If you already have a RicozBooks account associated with <code>{recipient_email}</code>, 
        signing in will grant you immediate access to this workspace.
      </p>

      <div class="fallback-box">
        <strong>Can't click the button?</strong> Copy and paste this URL into your browser:<br>
        <a href="{invite_url}">{invite_url}</a>
      </div>

      <div class="notice-box">
        If you were not expecting this invitation, please contact the administrator at 
        {company_name} or safely discard this email.
      </div>
    </div>

    <div class="email-footer">
      &copy; {datetime.utcnow().year} RicozBooks Cloud Technologies. All rights reserved.<br>
      Enterprise Double-Entry Accounting Engine & Multi-Entity Ledger Platform.
    </div>
  </div>
</body>
</html>
"""


def send_invitation_email(
    recipient_email: str,
    invitation_url: str,
    company_name: str,
    role_name: str,
    inviter_name: Optional[str] = None,
    expires_at: Optional[datetime] = None
) -> Tuple[bool, str, Optional[str]]:
    """
    Sends an invitation email using the configured SMTP server.
    
    Returns:
        (success: bool, status_code: str, message_or_error: Optional[str])
        status_code is one of: "SENT", "NOT_CONFIGURED", "FAILED"
    """
    if not is_smtp_configured():
        msg = (
            "SMTP is not configured on this server. "
            "Configure SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASSWORD in environment."
        )
        logger.info(f"Invitation email to {recipient_email} skipped: {msg}")
        return False, "NOT_CONFIGURED", msg

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"[RicozBooks] You've been invited to join {company_name}"
        msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
        msg["To"] = recipient_email

        # Attach text and HTML parts
        text_body = generate_invitation_text(
            recipient_email=recipient_email,
            company_name=company_name,
            role=role_name,
            invite_url=invitation_url,
            inviter_name=inviter_name,
            expires_at=expires_at
        )
        html_body = generate_invitation_html(
            recipient_email=recipient_email,
            company_name=company_name,
            role=role_name,
            invite_url=invitation_url,
            inviter_name=inviter_name,
            expires_at=expires_at
        )

        msg.attach(MIMEText(text_body, "plain", "utf-8"))
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        timeout = 10.0
        if settings.SMTP_SSL or settings.SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=timeout)
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=timeout)
            if settings.SMTP_TLS:
                server.starttls()

        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)

        server.send_message(msg)
        server.quit()

        logger.info(f"Successfully sent invitation email to {recipient_email} for company {company_name}")
        return True, "SENT", f"Invitation email delivered to {recipient_email}."

    except (smtplib.SMTPException, socket.error, OSError) as e:
        error_msg = f"Failed to deliver invitation email: {str(e)}"
        logger.error(f"SMTP error sending invitation to {recipient_email}: {error_msg}")
        return False, "FAILED", error_msg
    except Exception as e:
        error_msg = f"Unexpected error delivering invitation email: {str(e)}"
        logger.error(f"Unexpected error sending invitation to {recipient_email}: {error_msg}")
        return False, "FAILED", error_msg

