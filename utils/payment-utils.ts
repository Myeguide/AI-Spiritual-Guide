import { PaymentMethodType } from '@/lib/generated/prisma';

export function getPaymentMethodIcon(type: PaymentMethodType): string {
    switch (type) {
        case PaymentMethodType.CARD:
            return '💳';
        case PaymentMethodType.UPI:
            return '📱';
        case PaymentMethodType.NETBANKING:
            return '🏦';
        case PaymentMethodType.WALLET:
            return '👛';
        default:
            return '💰';
    }
}

export function formatCardNumber(cardNumber: string): string {
    return cardNumber.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
}

export function maskCardNumber(cardNumber: string): string {
    const cleaned = cardNumber.replace(/\s/g, '');
    if (cleaned.length < 4) return cleaned;

    const last4 = cleaned.slice(-4);
    const masked = cleaned.slice(0, -4).replace(/\d/g, '•');
    return formatCardNumber(masked + last4);
}

export function getCardNetworkLogo(network: string): string {
    const logos: Record<string, string> = {
        Visa: '/images/cards/visa.svg',
        MasterCard: '/images/cards/mastercard.svg',
        Maestro: '/images/cards/maestro.svg',
        RuPay: '/images/cards/rupay.svg',
        'American Express': '/images/cards/amex.svg',
        'Diners Club': '/images/cards/diners.svg',
    };
    return logos[network] || '/images/cards/default.svg';
}

export function validateUPI(upi: string): boolean {
    const upiRegex = /^[\w.-]+@[\w.-]+$/;
    return upiRegex.test(upi);
}

export function formatExpiryDate(month: string, year: string): string {
    return `${month}/${year.slice(-2)}`;
}

export function isCardExpired(month: string, year: string): boolean {
    const expiry = new Date(parseInt('20' + year), parseInt(month) - 1);
    return expiry < new Date();
}