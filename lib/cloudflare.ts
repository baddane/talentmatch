/**
 * Helper pour accéder aux bindings Cloudflare (DB, Vectorize, AI)
 * depuis les API routes Next.js
 *
 * En développement local : utilise des mocks ou wrangler dev
 * En production (Cloudflare Pages) : bindings réels
 */

// Pour Next.js + Cloudflare Pages, on accède aux bindings via le contexte de la requête
// Installe : npm install @cloudflare/next-on-pages
import { getRequestContext } from '@cloudflare/next-on-pages';

export function getBindings() {
  try {
    const ctx = getRequestContext();
    return ctx.env;
  } catch {
    // En dev local avec `next dev`, les bindings Cloudflare ne sont pas disponibles.
    // Lance `wrangler pages dev` à la place pour les avoir.
    throw new Error(
      'Cloudflare bindings non disponibles. Lance "wrangler pages dev .next/standalone" ' +
      'ou déploie sur Cloudflare Pages pour accéder à DB, Vectorize et AI.'
    );
  }
}

/**
 * Génère un embedding via Cloudflare AI
 * Modèle bge-base-en-v1.5 → 768 dimensions
 */
export async function generateEmbedding(text: string, AI: any): Promise<number[]> {
  const response = await AI.run('@cf/baai/bge-base-en-v1.5', {
    text: [text],
  });

  if (!response?.data?.[0]) {
    throw new Error('Échec de génération d\'embedding');
  }

  return response.data[0];
}

/**
 * Génère une explication du match via un LLM (llama-3.1-8b)
 */
export async function explainMatch(
  cvText: string,
  jobText: string,
  score: number,
  AI: any
): Promise<string> {
  const prompt = `Tu es un expert en recrutement. Analyse la compatibilité entre ce candidat et cette offre.

CANDIDAT:
${cvText}

OFFRE D'EMPLOI:
${jobText}

Score de similarité sémantique : ${score}%

En 3-4 phrases maximum, explique :
1. Les points forts de la correspondance
2. Les éventuels écarts à noter
3. Une recommandation claire (Très recommandé / Recommandé / Profil partiel)

Réponds en français, de façon concise et professionnelle.`;

  const response = await AI.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 300,
  });

  return response?.response || 'Explication non disponible.';
}

export function parseSkills(skillsJson: string): string[] {
  try {
    return JSON.parse(skillsJson) || [];
  } catch {
    return [];
  }
}
