/**
 * The research areas the scout agent rotates through. Each run gets the slice that was
 * scanned least recently, so the whole map is covered every few weeks and nothing goes stale.
 */
export const SLICES: { id: string; brief: string; languages: string[] }[] = [
  { id: "es-andalucia", brief: "Spain: Costa del Sol, Marbella, Málaga, Andalucía", languages: ["en", "es"] },
  { id: "es-balearics", brief: "Spain: Mallorca, Ibiza, Menorca", languages: ["en", "es", "de"] },
  { id: "es-canaries", brief: "Spain: Tenerife, Gran Canaria, Lanzarote, Fuerteventura", languages: ["en", "es"] },
  { id: "es-east", brief: "Spain: Valencia, Alicante, Costa Blanca, Murcia, La Manga", languages: ["en", "es"] },
  { id: "es-north-central", brief: "Spain: Barcelona, Catalonia, Madrid, Basque Country", languages: ["en", "es"] },
  { id: "pt", brief: "Portugal: Algarve, Lisbon, Cascais, Porto, Madeira", languages: ["en", "pt"] },
  { id: "it-fr", brief: "Italy and France, including Sardinia, Sicily, Côte d'Azur", languages: ["en", "it", "fr"] },
  { id: "uk-ie", brief: "UK and Ireland: residential padel camps and weekenders", languages: ["en"] },
  { id: "nordics", brief: "Sweden, Finland, Denmark, Norway: padel camps and trips organised from the Nordics", languages: ["en", "sv", "fi", "da", "no"] },
  { id: "benelux-dach", brief: "Netherlands, Belgium, Germany, Austria, Switzerland: camps and trips organised from there", languages: ["en", "nl", "de"] },
  { id: "baltics-poland", brief: "Estonia, Latvia, Lithuania, Poland: padel trips and camps organised from there", languages: ["en", "et", "pl"] },
  { id: "middle-east", brief: "UAE (Dubai, Abu Dhabi), Qatar, Saudi Arabia, Oman", languages: ["en"] },
  { id: "med-resorts", brief: "Greece, Cyprus, Turkey, Egypt, Morocco: resorts with padel programmes", languages: ["en"] },
  { id: "americas", brief: "Mexico, Argentina, USA, Caribbean: padel holidays and camps", languages: ["en", "es"] },
  { id: "pro-events", brief: "Travel packages to Premier Padel / FIP / Hexagon Cup events, with play included", languages: ["en", "es"] },
  { id: "themed", brief: "Themed trips worldwide: women-only, juniors, padel and yoga, seniors, beginners' weeks", languages: ["en"] },
];
