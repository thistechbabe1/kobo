export interface Bank {
  code: string;
  name: string;
  shortName: string;
  nipCode: string;
}

export const NIGERIAN_BANKS: Bank[] = [
  { code: '058', name: 'Guaranty Trust Bank (GTBank)', shortName: 'GTBank', nipCode: '000013' },
  { code: '057', name: 'Zenith Bank', shortName: 'Zenith', nipCode: '000015' },
  { code: '044', name: 'Access Bank', shortName: 'Access', nipCode: '000014' },
  { code: '011', name: 'First Bank of Nigeria', shortName: 'FirstBank', nipCode: '000016' },
  { code: '033', name: 'United Bank for Africa (UBA)', shortName: 'UBA', nipCode: '000004' },
  { code: '090', name: 'Kuda Microfinance Bank', shortName: 'Kuda', nipCode: '090267' },
  { code: '999', name: 'OPay Digital Services', shortName: 'OPay', nipCode: '090405' },
  { code: '505', name: 'Moniepoint Microfinance Bank', shortName: 'Moniepoint', nipCode: '090517' },
  { code: '214', name: 'First City Monument Bank (FCMB)', shortName: 'FCMB', nipCode: '000003' },
  { code: '070', name: 'Fidelity Bank', shortName: 'Fidelity', nipCode: '000007' },
  { code: '221', name: 'Stanbic IBTC Bank', shortName: 'Stanbic', nipCode: '000012' },
  { code: '232', name: 'Sterling Bank', shortName: 'Sterling', nipCode: '000001' },
];

export function getBankByCode(code: string): Bank | undefined {
  return NIGERIAN_BANKS.find(b => b.code === code);
}
