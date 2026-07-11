export interface SendMailOptions {
  to: string | string[];
  subject: string;
  template?: string;
  context?: Record<string, unknown>;
  text?: string;
  html?: string;
}

export abstract class MailAdapter {
  abstract sendMail(options: SendMailOptions): Promise<void>;
}
