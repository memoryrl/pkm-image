const GRAPHQL_URL = 'https://graphql.pokeapi.co/v1beta2';
const GRAPHQL_FALLBACK_URL = 'https://beta.pokeapi.co/graphql/v1beta';
const REST_URL = 'https://pokeapi.co/api/v2';

/** GitHub raw CDN(429 빈발) → jsDelivr CDN으로 변환 */
function toCdnUrl(url) {
  const match = url.match(
    /raw\.githubusercontent\.com\/PokeAPI\/sprites\/(?:master|main)\/(.+)/,
  );
  if (match) {
    return `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/${match[1]}`;
  }
  return url;
}

async function graphqlRequest(url, query, variables = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`GraphQL HTTP ${res.status}`);
  }

  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message ?? 'GraphQL error');
  }

  return json;
}

async function graphqlWithFallback(queryV2, queryV1, variables = {}) {
  const attempts = [
    [GRAPHQL_URL, queryV2],
    [GRAPHQL_FALLBACK_URL, queryV1],
  ];

  let lastError = null;

  for (const [url, query] of attempts) {
    try {
      return await graphqlRequest(url, query, variables);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError ?? new Error('API 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.');
}

export async function searchPokemonSuggestions(koreanName, limit = 8) {
  const trimmed = koreanName.trim();
  if (!trimmed) return [];

  try {
    const json = await graphqlWithFallback(
      `
        query SearchPokemonByKrName($pattern: String!, $limit: Int!) {
          pokemonspecies(
            where: {
              pokemonspeciesnames: {
                language_id: { _eq: 3 }
                name: { _ilike: $pattern }
              }
            }
            limit: $limit
            order_by: { id: asc }
          ) {
            pokemonspeciesnames(where: { language_id: { _eq: 3 } }, limit: 1) {
              name
            }
          }
        }
      `,
      `
        query SearchPokemonByKrName($pattern: String!, $limit: Int!) {
          pokemon_v2_pokemonspecies(
            where: {
              pokemon_v2_pokemonspeciesnames: {
                language_id: { _eq: 3 }
                name: { _ilike: $pattern }
              }
            }
            limit: $limit
            order_by: { id: asc }
          ) {
            pokemon_v2_pokemonspeciesnames(where: { language_id: { _eq: 3 } }, limit: 1) {
              name
            }
          }
        }
      `,
      { pattern: `%${trimmed}%`, limit },
    );

    const speciesList =
      json.data?.pokemonspecies ?? json.data?.pokemon_v2_pokemonspecies ?? [];

    const names = speciesList
      .map((species) => {
        const namesArr =
          species.pokemonspeciesnames ?? species.pokemon_v2_pokemonspeciesnames;
        return namesArr?.[0]?.name;
      })
      .filter(Boolean);

    const lower = trimmed.toLowerCase();
    return [...new Set(names)].sort((a, b) => {
      const aStarts = a.toLowerCase().startsWith(lower);
      const bStarts = b.toLowerCase().startsWith(lower);
      if (aStarts !== bStarts) return aStarts ? -1 : 1;
      return a.localeCompare(b, 'ko');
    });
  } catch {
    return [];
  }
}

export async function fetchPokemonByKoreanName(koreanName) {
  const json = await graphqlWithFallback(
    `
      query GetPokemonByKrName($name: String!) {
        pokemonspecies(
          where: {
            pokemonspeciesnames: {
              language_id: { _eq: 3 }
              name: { _eq: $name }
            }
          }
          limit: 1
        ) {
          id
          pokemons(order_by: { id: asc }, limit: 1) {
            id
            name
          }
        }
      }
    `,
    `
      query GetPokemonByKrName($name: String!) {
        pokemon_v2_pokemonspecies(
          where: {
            pokemon_v2_pokemonspeciesnames: {
              language_id: { _eq: 3 }
              name: { _eq: $name }
            }
          }
          limit: 1
        ) {
          id
          pokemon_v2_pokemons(order_by: { id: asc }, limit: 1) {
            id
            name
          }
        }
      }
    `,
    { name: koreanName },
  );

  const species = json.data?.pokemonspecies?.[0] ?? json.data?.pokemon_v2_pokemonspecies?.[0];
  if (!species) throw new Error(`"${koreanName}" 포켓몬을 찾을 수 없습니다.`);

  const pokemon = species.pokemons?.[0] ?? species.pokemon_v2_pokemons?.[0];
  if (!pokemon) throw new Error('포켓몬 데이터를 불러올 수 없습니다.');

  return { id: pokemon.id, name: pokemon.name, speciesId: species.id };
}

export function getArtworkUrlByPokemonId(pokemonId) {
  return `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/${pokemonId}.png`;
}

const DEX_PAGE_SIZE = 10;

const TYPE_COLORS = {
  normal: '#A8A878',
  fire: '#F08030',
  water: '#6890F0',
  electric: '#F8D030',
  grass: '#78C850',
  ice: '#98D8D8',
  fighting: '#C03028',
  poison: '#A040A0',
  ground: '#E0C068',
  flying: '#A890F0',
  psychic: '#F85888',
  bug: '#A8B820',
  rock: '#B8A038',
  ghost: '#705898',
  dragon: '#7038F8',
  dark: '#705848',
  steel: '#B8B8D0',
  fairy: '#EE99AC',
};

export function getTypeColor(typeName) {
  return TYPE_COLORS[typeName] ?? '#94a3b8';
}

function parseDexSpeciesList(speciesList) {
  return speciesList
    .map((species) => {
      const koreanName = (
        species.pokemonspeciesnames ?? species.pokemon_v2_pokemonspeciesnames
      )?.[0]?.name;

      const pokemon = species.pokemons?.[0] ?? species.pokemon_v2_pokemons?.[0];
      const pokemonId = pokemon?.id;
      if (!koreanName || !pokemonId) return null;

      const typeEntries = pokemon.pokemontypes ?? pokemon.pokemon_v2_pokemontypes ?? [];
      const types = typeEntries
        .map((entry) => {
          const type = entry.type ?? entry.pokemon_v2_type;
          const koreanTypeName = (
            type?.typenames ?? type?.pokemon_v2_typenames
          )?.[0]?.name;
          return {
            name: type?.name,
            koreanName: koreanTypeName ?? type?.name,
          };
        })
        .filter((type) => type.name);

      return {
        speciesId: species.id,
        pokemonId,
        koreanName,
        types,
        artworkUrl: getArtworkUrlByPokemonId(pokemonId),
      };
    })
    .filter(Boolean);
}

export async function fetchPokemonDexPage(page = 1, pageSize = DEX_PAGE_SIZE) {
  const offset = (page - 1) * pageSize;

  const json = await graphqlWithFallback(
    `
      query FetchPokemonDexPage($limit: Int!, $offset: Int!) {
        pokemonspecies_aggregate {
          aggregate { count }
        }
        pokemonspecies(limit: $limit, offset: $offset, order_by: { id: asc }) {
          id
          pokemonspeciesnames(where: { language_id: { _eq: 3 } }, limit: 1) {
            name
          }
          pokemons(order_by: { id: asc }, limit: 1) {
            id
            pokemontypes(order_by: { slot: asc }) {
              type {
                name
                typenames(where: { language_id: { _eq: 3 } }, limit: 1) {
                  name
                }
              }
            }
          }
        }
      }
    `,
    `
      query FetchPokemonDexPage($limit: Int!, $offset: Int!) {
        pokemon_v2_pokemonspecies_aggregate {
          aggregate { count }
        }
        pokemon_v2_pokemonspecies(limit: $limit, offset: $offset, order_by: { id: asc }) {
          id
          pokemon_v2_pokemonspeciesnames(where: { language_id: { _eq: 3 } }, limit: 1) {
            name
          }
          pokemon_v2_pokemons(limit: 1, order_by: { id: asc }) {
            id
            pokemon_v2_pokemontypes(order_by: { slot: asc }) {
              pokemon_v2_type {
                name
                pokemon_v2_typenames(where: { language_id: { _eq: 3 } }, limit: 1) {
                  name
                }
              }
            }
          }
        }
      }
    `,
    { limit: pageSize, offset },
  );

  const total =
    json.data?.pokemonspecies_aggregate?.aggregate?.count ??
    json.data?.pokemon_v2_pokemonspecies_aggregate?.aggregate?.count ??
    0;

  const speciesList =
    json.data?.pokemonspecies ?? json.data?.pokemon_v2_pokemonspecies ?? [];

  return {
    items: parseDexSpeciesList(speciesList),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function fetchArtworkUrl(pokemonId) {
  const res = await fetch(`${REST_URL}/pokemon/${pokemonId}`);
  if (!res.ok) throw new Error('이미지 정보를 가져올 수 없습니다.');

  const data = await res.json();
  const rawUrl =
    data.sprites?.other?.['official-artwork']?.front_default ||
    data.sprites?.other?.home?.front_default ||
    data.sprites?.front_default;

  if (!rawUrl) throw new Error('공식 일러스트를 찾을 수 없습니다.');
  return toCdnUrl(rawUrl);
}

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(
        new Error(
          '이미지를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.',
        ),
      );
    img.src = url;
  });
}

const HEALTH_QUERY_V2 = '{ pokemonspecies(limit: 1) { id } }';
const HEALTH_QUERY_V1 = '{ pokemon_v2_pokemonspecies(limit: 1) { id } }';

async function pingGraphql(url, query) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return 'error';
    const json = await res.json();
    return json.errors?.length ? 'error' : 'ok';
  } catch {
    return 'error';
  }
}

async function pingUrl(url, method = 'GET') {
  try {
    const res = await fetch(url, { method, signal: AbortSignal.timeout(8000) });
    return res.ok ? 'ok' : 'error';
  } catch {
    return 'error';
  }
}

function resolveOverall({ graphql, graphqlFallback, rest, image }) {
  const searchOk = graphql === 'ok' || graphqlFallback === 'ok';
  if (searchOk && rest === 'ok' && image === 'ok') return 'ok';
  if (searchOk && (rest === 'ok' || image === 'ok')) return 'degraded';
  if (searchOk) return 'degraded';
  return 'down';
}

const OVERALL_LABELS = {
  checking: '확인 중',
  ok: '정상',
  degraded: '일부 장애',
  down: '장애',
};

async function pingImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => resolve('error'), 8000);
    img.onload = () => {
      clearTimeout(timer);
      resolve('ok');
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve('error');
    };
    img.src = url;
  });
}

export async function checkApiHealth() {
  const [graphql, graphqlFallback, rest, image] = await Promise.all([
    pingGraphql(GRAPHQL_URL, HEALTH_QUERY_V2),
    pingGraphql(GRAPHQL_FALLBACK_URL, HEALTH_QUERY_V1),
    pingUrl(`${REST_URL}/pokemon/25`),
    pingImage(getArtworkUrlByPokemonId(25)),
  ]);

  const overall = resolveOverall({ graphql, graphqlFallback, rest, image });

  return {
    graphql,
    graphqlFallback,
    rest,
    image,
    overall,
    overallLabel: OVERALL_LABELS[overall],
    checkedAt: new Date(),
  };
}

export { GRAPHQL_URL, GRAPHQL_FALLBACK_URL, REST_URL };
