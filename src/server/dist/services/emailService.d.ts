export declare class EmailService {
    private apiKey;
    private apiUrl;
    constructor();
    sendVerificationEmail(to: string, verifyUrl: string, role?: 'retailer' | 'user'): Promise<boolean>;
    sendContactEmail(name: string, fromEmail: string, message: string): Promise<boolean>;
    private escapeHtml;
    private getFromAddress;
    private sendMail;
    sendWelcomeEmail(to: string, name: string, type: 'retailer' | 'user'): Promise<void>;
    sendPaymentSuccessEmail(to: string, name: string, planType: string): Promise<void>;
    sendFitSessionCompleteEmail(to: string, name: string): Promise<void>;
    sendPasswordResetEmail(to: string, resetLink: string): Promise<boolean>;
    testConnection(): Promise<boolean>;
    sendFitSessionCompletedEmail(to: string, name: string): Promise<void>;
    sendSubscriptionSuccessEmail(email: string, firstName: string, planName: string): Promise<void>;
    sendPaymentFailedEmail(email: string, firstName: string): Promise<void>;
    private getRetailerWelcomeTemplate;
    private getUserWelcomeTemplate;
    private getPaymentSuccessTemplate;
    private getFitSessionCompleteTemplate;
    private getPasswordResetTemplate;
}
declare const _default: EmailService;
export default _default;
//# sourceMappingURL=emailService.d.ts.map