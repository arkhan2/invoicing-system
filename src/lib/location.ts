/**
 * Country, state, and city data from country-state-city package.
 * Uses names for form values (DB compatibility); Pakistan is first in country list.
 */

import { Country, State, City } from "country-state-city";

const PAKISTAN_ISO = "PK";

export type CountryOption = { name: string; isoCode: string };
export type StateOption = { name: string; isoCode: string };
export type CityOption = { name: string };

let _countries: CountryOption[] | null = null;

/** All countries with Pakistan first. */
export function getCountries(): CountryOption[] {
  if (_countries) return _countries;
  const all = Country.getAllCountries();
  const list: CountryOption[] = all.map((c) => ({ name: c.name, isoCode: c.isoCode }));
  const pakistan = list.find((c) => c.isoCode === PAKISTAN_ISO);
  const rest = list.filter((c) => c.isoCode !== PAKISTAN_ISO);
  _countries = pakistan ? [pakistan, ...rest] : list;
  return _countries;
}

/** States/provinces for a country (by country name or isoCode). */
export function getStates(countryNameOrCode: string): StateOption[] {
  if (!countryNameOrCode.trim()) return [];
  const countries = getCountries();
  const country = countries.find(
    (c) => c.name === countryNameOrCode || c.isoCode === countryNameOrCode
  );
  if (!country) return [];
  const states = State.getStatesOfCountry(country.isoCode);
  return states.map((s) => ({ name: s.name, isoCode: s.isoCode }));
}

/** Cities for a country and state (by names or codes). */
export function getCities(countryNameOrCode: string, stateNameOrCode: string): CityOption[] {
  if (!countryNameOrCode.trim() || !stateNameOrCode.trim()) return [];
  const countries = getCountries();
  const country = countries.find(
    (c) => c.name === countryNameOrCode || c.isoCode === countryNameOrCode
  );
  if (!country) return [];
  const states = State.getStatesOfCountry(country.isoCode);
  const state = states.find(
    (s) => s.name === stateNameOrCode || s.isoCode === stateNameOrCode
  );
  if (!state) return [];
  const cities = City.getCitiesOfState(country.isoCode, state.isoCode);
  return cities.map((c) => ({ name: c.name }));
}
