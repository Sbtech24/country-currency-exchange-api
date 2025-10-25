export interface ExchangeRateResponse {
  result: string;
  provider: string;
  documentation: string;
  terms_of_use: string;
  time_last_update_unix: number;
  time_last_update_utc: string;
  time_next_update_unix: number;
  time_next_update_utc: string;
  time_eol_unix: number;
  base_code: string;
  rates: Record<string, number>;
}

export interface Country {
  name: string;
  capital: string;
  region: string;
  population: number;
  flag: string;
  currencies: Currency[];
}

export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

export interface CountryExchangeResponse {

  name: string;
  capital: string;
  region: string;
  population: number;
  currency_code: string;
  exchange_rate: number | null; // null if missing
  estimated_gdp: number;        // calculated field
  flag_url: string;
  last_refreshed_at: string;    // ISO string
}

export function buildCountryExchangeData( countries: Country[], exchangeData: ExchangeRateResponse): CountryExchangeResponse[] {
  const now = new Date().toISOString();

  return countries.map((country, index) => {
    const mainCurrency = country.currencies?.[0];
    const code = mainCurrency?.code || "N/A";

    const rate = exchangeData.rates[code] ?? 0 ;

    const random = Math.floor(Math.random() * 1000)
    const estimated_gdp = country.population * random / rate
    return {
      name: country.name,
      capital: country.capital,
      region: country.region,
      population: country.population,
      currency_code: code,
      exchange_rate: rate,
      estimated_gdp,
      flag_url: country.flag,
      last_refreshed_at: exchangeData.time_last_update_utc || now,
    };
  });
}



export  const fetchData = async ()=>{
    const data  = await fetch("https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies")
    const res = await data.json() as Country[]
    
    const fetchRates  = await fetch("https://open.er-api.com/v6/latest/USD")
    const response = await fetchRates.json() as ExchangeRateResponse
  

    return buildCountryExchangeData(res,response)

}

