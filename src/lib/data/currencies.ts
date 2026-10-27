/**
 * The currencies worth offering, with the places that use them.
 *
 * The country names are here so searching for "morocco" or
 * "spain" finds the right one, which is how people actually
 * think about this.
 */
export interface Currency {
  code: string;
  name: string;
  where: string;
}

export const CURRENCIES: Currency[] = [
  { code: "DH", name: "Moroccan dirham", where: "Morocco" },
  { code: "EUR", name: "Euro", where: "France, Spain, Germany, Italy, the euro area" },
  { code: "USD", name: "US dollar", where: "United States" },
  { code: "GBP", name: "Pound sterling", where: "United Kingdom" },
  { code: "CHF", name: "Swiss franc", where: "Switzerland" },
  { code: "CAD", name: "Canadian dollar", where: "Canada" },
  { code: "AUD", name: "Australian dollar", where: "Australia" },
  { code: "NZD", name: "New Zealand dollar", where: "New Zealand" },
  { code: "AED", name: "UAE dirham", where: "United Arab Emirates, Dubai" },
  { code: "SAR", name: "Saudi riyal", where: "Saudi Arabia" },
  { code: "QAR", name: "Qatari riyal", where: "Qatar" },
  { code: "KWD", name: "Kuwaiti dinar", where: "Kuwait" },
  { code: "BHD", name: "Bahraini dinar", where: "Bahrain" },
  { code: "OMR", name: "Omani rial", where: "Oman" },
  { code: "EGP", name: "Egyptian pound", where: "Egypt" },
  { code: "TND", name: "Tunisian dinar", where: "Tunisia" },
  { code: "DZD", name: "Algerian dinar", where: "Algeria" },
  { code: "LYD", name: "Libyan dinar", where: "Libya" },
  { code: "MRU", name: "Mauritanian ouguiya", where: "Mauritania" },
  { code: "TRY", name: "Turkish lira", where: "Turkey" },
  { code: "SEK", name: "Swedish krona", where: "Sweden" },
  { code: "NOK", name: "Norwegian krone", where: "Norway" },
  { code: "DKK", name: "Danish krone", where: "Denmark" },
  { code: "PLN", name: "Polish zloty", where: "Poland" },
  { code: "CZK", name: "Czech koruna", where: "Czechia" },
  { code: "RON", name: "Romanian leu", where: "Romania" },
  { code: "JPY", name: "Japanese yen", where: "Japan" },
  { code: "CNY", name: "Chinese yuan", where: "China" },
  { code: "HKD", name: "Hong Kong dollar", where: "Hong Kong" },
  { code: "SGD", name: "Singapore dollar", where: "Singapore" },
  { code: "KRW", name: "South Korean won", where: "South Korea" },
  { code: "INR", name: "Indian rupee", where: "India" },
  { code: "PKR", name: "Pakistani rupee", where: "Pakistan" },
  { code: "IDR", name: "Indonesian rupiah", where: "Indonesia" },
  { code: "MYR", name: "Malaysian ringgit", where: "Malaysia" },
  { code: "THB", name: "Thai baht", where: "Thailand" },
  { code: "PHP", name: "Philippine peso", where: "Philippines" },
  { code: "NGN", name: "Nigerian naira", where: "Nigeria" },
  { code: "GHS", name: "Ghanaian cedi", where: "Ghana" },
  { code: "KES", name: "Kenyan shilling", where: "Kenya" },
  { code: "ZAR", name: "South African rand", where: "South Africa" },
  { code: "XOF", name: "West African CFA franc", where: "Senegal, Ivory Coast, Mali" },
  { code: "XAF", name: "Central African CFA franc", where: "Cameroon, Chad, Gabon" },
  { code: "BRL", name: "Brazilian real", where: "Brazil" },
  { code: "MXN", name: "Mexican peso", where: "Mexico" },
  { code: "ARS", name: "Argentine peso", where: "Argentina" },
  { code: "CLP", name: "Chilean peso", where: "Chile" },
  { code: "COP", name: "Colombian peso", where: "Colombia" },
  { code: "ILS", name: "Israeli shekel", where: "Israel" },
  { code: "JOD", name: "Jordanian dinar", where: "Jordan" },
  { code: "LBP", name: "Lebanese pound", where: "Lebanon" },
  { code: "RUB", name: "Russian rouble", where: "Russia" },
  { code: "UAH", name: "Ukrainian hryvnia", where: "Ukraine" },
];

/** Code first, then name, then place. An exact code wins. */
export function searchCurrencies(query: string): Currency[] {
  const q = query.trim().toLowerCase();
  if (!q) return CURRENCIES;

  const hits = CURRENCIES.filter(
    (c) =>
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.where.toLowerCase().includes(q),
  );

  return hits.sort((a, b) => {
    const rank = (c: Currency) =>
      c.code.toLowerCase() === q ? 0
      : c.code.toLowerCase().startsWith(q) ? 1
      : c.name.toLowerCase().startsWith(q) ? 2
      : c.where.toLowerCase().startsWith(q) ? 3
      : 4;
    return rank(a) - rank(b);
  });
}
