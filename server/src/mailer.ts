import nodemailer from 'nodemailer';

export interface Mailer {
  sendVerification(to: string, verifyUrl: string): Promise<void>;
}

export function createSmtpMailer(smtpUrl: string, from: string): Mailer {
  const transport = nodemailer.createTransport(smtpUrl);
  return {
    async sendVerification(to, verifyUrl) {
      await transport.sendMail({
        from,
        to,
        subject: 'Verify your SubTracker email',
        text: `Confirm your email address to finish creating your SubTracker account:\n\n${verifyUrl}\n\nThe link expires in 24 hours. If you did not sign up, ignore this email.`,
      });
    },
  };
}

/** Development only: prints the link instead of sending mail. */
export function createConsoleMailer(): Mailer {
  return {
    async sendVerification(to, verifyUrl) {
      console.log(`[dev mail] verification for ${to}: ${verifyUrl}`);
    },
  };
}
