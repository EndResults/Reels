import axios from 'axios';

export class EmailService {
  private apiKey: string;
  private apiUrl: string;

  constructor() {
    this.apiKey = process.env.BREVO_API_KEY || '';
    this.apiUrl = 'https://api.brevo.com/v3/smtp/email';

    if (!this.apiKey) {
      console.error('❌ BREVO_API_KEY ontbreekt — voeg toe in Railway env vars');
    } else {
      console.log('✅ Brevo EmailService klaar voor gebruik (API-modus)');
    }
  }

  async sendVerificationEmail(to: string, verifyUrl: string, role: 'retailer' | 'user' = 'user'): Promise<boolean> {
    const subject = role === 'retailer' ? 'Bevestig je e-mailadres voor je FiT Retailer account' : 'Bevestig je e-mailadres voor FiT';
    const html = `
      <!DOCTYPE html>
      <html lang="nl">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${subject}</title>
      </head>
      <body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
        <table role="presentation" style="width:100%;border-collapse:collapse;background-color:#f5f5f5;">
          <tr>
            <td style="padding:40px 20px;">
              <table role="presentation" style="max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);overflow:hidden;">
                <tr>
                  <td style="background-color:#0f172a;padding:30px;text-align:center;">
                    <h1 style="margin:0;color:#fff;font-size:20px;line-height:1.2;">FiT by BrendR</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:36px 28px;text-align:center;">
                    <h2 style="color:#0f172a;font-size:24px;margin:0 0 12px 0;">Bevestig je e-mailadres</h2>
                    <p style="color:#555;font-size:16px;line-height:1.6;margin:0 0 24px 0;">
                      Klik op de knop hieronder om je e-mailadres te bevestigen en verder te gaan met ${role === 'retailer' ? 'je retailer dashboard' : 'je FiT account'}.
                    </p>
                    <table role="presentation" style="margin:0 auto;">
                      <tr>
                        <td style="border-radius:6px;background-color:#16a34a;">
                          <a href="${verifyUrl}" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">Bevestig e-mailadres</a>
                        </td>
                      </tr>
                    </table>
                    <p style="color:#777;font-size:13px;line-height:1.6;margin:24px 0 0 0;">
                      Werkt de knop niet? Kopieer en plak deze link in je browser:
                    </p>
                    <p style="color:#2563eb;font-size:12px;word-break:break-all;margin:6px 0 0 0;">${verifyUrl}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 28px;background-color:#f9f9f9;border-top:1px solid #eee;text-align:center;color:#999;font-size:12px;">
                    Deze link is beperkt geldig. Vraag indien nodig een nieuwe verificatie aan via de website.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>`;
    return this.sendMail(to, subject, html);
  }

  async sendContactEmail(name: string, fromEmail: string, message: string): Promise<boolean> {
    const to = process.env.CONTACT_TO_EMAIL || 'fit@brendr.io';
    const subject = `Nieuw bericht via contactformulier - ${name}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
        <h2 style="color:#0f172a;">Nieuw contactformulier</h2>
        <p><strong>Naam:</strong> ${this.escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${this.escapeHtml(fromEmail)}</p>
        <hr style="border:none;border-top:1px solid #eee;margin:16px 0;" />
        <p style="white-space:pre-wrap;">${this.escapeHtml(message)}</p>
      </div>`;
    return this.sendMail(to, subject, html);
  }

  // Simple HTML escaping to reduce risk of injection into email templates
  private escapeHtml(input: string): string {
    return String(input)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Centrale methode voor "from" adres
  private getFromAddress(): { name: string; email: string } {
    const name = process.env.EMAIL_FROM_NAME || 'FiT by Brendr';
    const email = process.env.EMAIL_FROM || 'fit@brendr.io';
    return { name, email };
  }

  // Algemene mailfunctie via Brevo API
  private async sendMail(
    to: string,
    subject: string,
    html: string
  ): Promise<boolean> {
    try {
      const sender = this.getFromAddress();

      const payload = {
        sender,
        to: [{ email: to }],
        subject,
        htmlContent: html,
      };

      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey,
        },
        timeout: 15000,
      });

      console.log(`📧 Mail verzonden naar ${to} (status: ${response.status})`);
      return true;
    } catch (error: any) {
      console.error(
        '❌ Fout bij versturen e-mail:',
        error.response?.data || error.message
      );
      return false;
    }
  }

  async sendWelcomeEmail(to: string, name: string, type: 'retailer' | 'user') {
    const subject =
      type === 'retailer'
        ? 'Welkom bij FiT - Retailer Account'
        : 'Welkom bij FiT';
    const html =
      type === 'retailer'
        ? this.getRetailerWelcomeTemplate(name)
        : this.getUserWelcomeTemplate(name);

    try {
      await this.sendMail(to, subject, html);
      console.log(`✅ Welcome email sent to ${to}`);
    } catch (error) {
      console.error('❌ Failed to send welcome email:', error);
    }
  }

  async sendPaymentSuccessEmail(to: string, name: string, planType: string) {
    try {
      await this.sendMail(
        to,
        'Betaling Succesvol - FiT Account Geactiveerd',
        this.getPaymentSuccessTemplate(name, planType)
      );
      console.log(`✅ Payment success email sent to ${to}`);
    } catch (error) {
      console.error('❌ Failed to send payment success email:', error);
    }
  }

  async sendFitSessionCompleteEmail(to: string, name: string) {
    try {
      await this.sendMail(
        to,
        'Je FiT Sessie is Voltooid!',
        this.getFitSessionCompleteTemplate(name)
      );
      console.log(`✅ FiT session complete email sent to ${to}`);
    } catch (error) {
      console.error('❌ Failed to send FiT session complete email:', error);
    }
  }

  async sendPasswordResetEmail(to: string, resetLink: string): Promise<boolean> {
    try {
      const html = this.getPasswordResetTemplate('Gebruiker', resetLink);
      const sent = await this.sendMail(
        to,
        'Wachtwoord Reset - FiT by Brendr.io',
        html
      );
      console.log(`✅ Password reset email sent to ${to}`);
      return sent;
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error);
      throw error;
    }
  }

  async testConnection() {
    try {
      console.log('🟦 Brevo API check → ', this.apiUrl);

      // Test de API verbinding met een kleine request
      const response = await axios.get('https://api.brevo.com/v3/account', {
        headers: {
          'api-key': this.apiKey,
        },
        timeout: 10000,
      });

      console.log('✅ Brevo API connection successful');
      return true;
    } catch (err: any) {
      console.error(
        '❌ Brevo API connection failed:',
        err.response?.data || err.message
      );
      return false;
    }
  }

  async sendFitSessionCompletedEmail(to: string, name: string) {
    return this.sendFitSessionCompleteEmail(to, name);
  }

  async sendSubscriptionSuccessEmail(
    email: string,
    firstName: string,
    planName: string
  ) {
    const subject = 'Welkom bij FiT - Je abonnement is actief!';
    const html = `
      <h1>Welkom bij FiT, ${firstName}!</h1>
      <p>Je ${planName} abonnement is succesvol geactiveerd.</p>
      <p>Je kunt nu beginnen met het gebruik van onze FiT widget op je webshop.</p>
    `;

    try {
      await this.sendMail(email, subject, html);
      console.log(`✅ Subscription success email sent to ${email}`);
    } catch (error) {
      console.error('❌ Failed to send subscription success email:', error);
    }
  }

  async sendPaymentFailedEmail(email: string, firstName: string) {
    const subject = 'Betaling mislukt - FiT abonnement';
    const html = `
      <h1>Hallo ${firstName},</h1>
      <p>We konden je laatste betaling niet verwerken.</p>
      <p>Log in op je account om je betalingsgegevens bij te werken.</p>
    `;

    try {
      await this.sendMail(email, subject, html);
      console.log(`✅ Payment failed email sent to ${email}`);
    } catch (error) {
      console.error('❌ Failed to send payment failed email:', error);
    }
  }

  private getRetailerWelcomeTemplate(name: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Welkom bij FiT by Brendr.io!</h1>
        <p>Hallo ${name},</p>
        <p>Bedankt voor je registratie als retailer bij FiT. Je account is succesvol aangemaakt.</p>
        <p>Je kunt nu inloggen en je plan selecteren om te beginnen met virtuele paskamer sessies.</p>
        <p>Met vriendelijke groet,<br>Het FiT Team</p>
      </div>
    `;
  }

  private getUserWelcomeTemplate(name: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Welkom bij FiT!</h1>
        <p>Hallo ${name},</p>
        <p>Je account is succesvol aangemaakt. Je kunt nu virtuele paskamer sessies starten.</p>
        <p>Met vriendelijke groet,<br>Het FiT Team</p>
      </div>
    `;
  }

  private getPaymentSuccessTemplate(name: string, planType: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #28a745;">Betaling Succesvol!</h1>
        <p>Hallo ${name},</p>
        <p>Je betaling voor het ${planType} plan is succesvol verwerkt.</p>
        <p>Je account is nu volledig geactiveerd en je kunt beginnen met het gebruik van FiT.</p>
        <p>Met vriendelijke groet,<br>Het FiT Team</p>
      </div>
    `;
  }

  private getFitSessionCompleteTemplate(name: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">FiT Sessie Voltooid!</h1>
        <p>Hallo ${name},</p>
        <p>Je virtuele paskamer sessie is succesvol voltooid.</p>
        <p>Je kunt je resultaten bekijken in je account.</p>
        <p>Met vriendelijke groet,<br>Het FiT Team</p>
      </div>
    `;
  }

  private getPasswordResetTemplate(name: string, resetUrl: string): string {
  return `
  <!DOCTYPE html>
  <html lang="nl">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Wachtwoord Reset</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
          <tr>
              <td style="padding: 40px 20px;">
                  <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
                      
                      <!-- Header -->
                      <tr>
                          <td style="background-color: #0f172a; padding: 30px; text-align: center;">
                              <img src="https://img.mailinblue.com/10036323/images/content_library/original/68ece2a186ceaf43b4e05fdb.png" alt="BrendR Logo" style="height: 90px;">
                          </td>
                      </tr>
                      
                      <!-- Content -->
                      <tr>
                          <td style="padding: 50px 40px; text-align: center;">
                              <div style="width: 80px; height: 80px; background-color: #dbeafe; border-radius: 50%; margin: 0 auto 30px; display: flex; align-items: center; justify-content: center;">
                                  <svg width="38" height="38" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M12 11V17M12 7H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                                  </svg>
                              </div>

                              <h2 style="color: #0f172a; font-size: 26px; margin-bottom: 15px;">Wachtwoord Reset</h2>
                              <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                                  Hallo ${name},<br>
                                  Je hebt een verzoek ingediend om je wachtwoord te resetten.<br>
                                  Klik op onderstaande knop om een nieuw wachtwoord in te stellen.
                              </p>

                              <!-- CTA Button -->
                              <table role="presentation" style="margin: 0 auto;">
                                  <tr>
                                      <td style="border-radius: 6px; background-color: #f97316;">
                                          <a href="${resetUrl}" style="display: inline-block; padding: 16px 40px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px;">
                                              Stel nieuw wachtwoord in
                                          </a>
                                      </td>
                                  </tr>
                              </table>

                              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 30px 0 10px 0;">
                                  Of kopieer en plak deze link in je browser:
                              </p>
                              <p style="color: #f97316; font-size: 14px; word-break: break-all; margin: 0;">
                                  ${resetUrl}
                              </p>
                          </td>
                      </tr>

                      <!-- Footer -->
                      <tr>
                          <td style="padding: 25px 40px; background-color: #f9f9f9; border-top: 1px solid #eeeeee; text-align: center;">
                              <p style="color: #999999; font-size: 13px; margin: 0;">
                                  Deze link is geldig voor 1 uur. Heb je dit niet aangevraagd? Negeer deze e-mail dan gerust.
                              </p>
                              <p style="color: #999999; font-size: 13px; margin-top: 15px;">
                                  © 2025 FiT by BrendR.io — Alle rechten voorbehouden.
                              </p>
                          </td>
                      </tr>
                  </table>
              </td>
          </tr>
      </table>
  </body>
  </html>`;
}
}

export default new EmailService();
