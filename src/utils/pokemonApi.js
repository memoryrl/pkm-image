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
