const GRAPHQL_URL = 'https://graphql.pokeapi.co/v1beta2';
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

export async function searchPokemonSuggestions(koreanName, limit = 8) {
  const trimmed = koreanName.trim();
  if (!trimmed) return [];

  const query = `
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
        id
        pokemonspeciesnames(where: { language_id: { _eq: 3 } }, limit: 1) {
          name
        }
      }
    }
  `;

  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      variables: { pattern: `%${trimmed}%`, limit },
    }),
  });

  if (!res.ok) return [];

  const json = await res.json();
  if (json.errors?.length) return [];

  const names = (json.data?.pokemonspecies ?? [])
    .map((species) => species.pokemonspeciesnames?.[0]?.name)
    .filter(Boolean);

  const lower = trimmed.toLowerCase();
  return [...new Set(names)].sort((a, b) => {
    const aStarts = a.toLowerCase().startsWith(lower);
    const bStarts = b.toLowerCase().startsWith(lower);
    if (aStarts !== bStarts) return aStarts ? -1 : 1;
    return a.localeCompare(b, 'ko');
  });
}

export async function fetchPokemonByKoreanName(koreanName) {
  const query = `
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
  `;

  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { name: koreanName } }),
  });

  if (!res.ok) throw new Error('API 요청에 실패했습니다.');

  const json = await res.json();
  if (json.errors?.length) throw new Error('포켓몬을 찾을 수 없습니다.');

  const species = json.data?.pokemonspecies?.[0];
  if (!species) throw new Error(`"${koreanName}" 포켓몬을 찾을 수 없습니다.`);

  const pokemon = species.pokemons?.[0];
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

export async function fetchPokemonDexPage(page = 1, pageSize = DEX_PAGE_SIZE) {
  const offset = (page - 1) * pageSize;

  const query = `
    query FetchPokemonDexPage($limit: Int!, $offset: Int!) {
      pokemonspecies_aggregate {
        aggregate {
          count
        }
      }
      pokemonspecies(
        limit: $limit
        offset: $offset
        order_by: { id: asc }
      ) {
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
  `;

  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      variables: { limit: pageSize, offset },
    }),
  });

  if (!res.ok) throw new Error('도감 정보를 불러올 수 없습니다.');

  const json = await res.json();
  if (json.errors?.length) throw new Error('도감 정보를 불러올 수 없습니다.');

  const total = json.data?.pokemonspecies_aggregate?.aggregate?.count ?? 0;
  const speciesList = json.data?.pokemonspecies ?? [];

  const items = speciesList
    .map((species) => {
      const koreanName = species.pokemonspeciesnames?.[0]?.name;
      const pokemon = species.pokemons?.[0];
      const pokemonId = pokemon?.id;
      if (!koreanName || !pokemonId) return null;

      const types = (pokemon.pokemontypes ?? [])
        .map((entry) => ({
          name: entry.type?.name,
          koreanName: entry.type?.typenames?.[0]?.name ?? entry.type?.name,
        }))
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

  return {
    items,
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
