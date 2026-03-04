import { NextRequest, NextResponse } from 'next/server';
import { getBindings, generateEmbedding, explainMatch, parseSkills } from '@/lib/cloudflare';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const env = getBindings();
    const { searchParams } = new URL(req.url);
    const cvId = searchParams.get('cvId');
    const jobId = searchParams.get('jobId');
    const withExplanation = searchParams.get('explain') === 'true';

    // ── Mode 1 : Trouver des offres pour un CV ────────────────────────────
    if (cvId) {
      const cv = await env.DB.prepare('SELECT * FROM cvs WHERE id = ?').bind(cvId).first() as any;
      if (!cv) return NextResponse.json({ error: 'CV introuvable' }, { status: 404 });

      const cvText = [
        `Candidat : ${cv.name}`,
        `Compétences : ${parseSkills(cv.skills).join(', ')}`,
        `Expérience : ${cv.experience}`,
        `Formation : ${cv.education}`,
        `Profil : ${cv.summary}`,
      ].filter(s => s.split(': ')[1]?.trim()).join('\n');

      const embedding = await generateEmbedding(cvText, env.AI);

      const vectorResults = await env.VECTORIZE_JOBS.query(embedding, {
        topK: 8,
        returnMetadata: true,
      });

      // Enrichir avec les données D1
      const matches = await Promise.all(
        (vectorResults.matches || []).map(async (m: any) => {
          const job = await env.DB.prepare('SELECT * FROM jobs WHERE id = ?').bind(m.id).first() as any;
          if (!job) return null;

          const score = Math.round(m.score * 100);
          let explanation = null;

          if (withExplanation && score >= 40) {
            const jobText = `Poste : ${job.title}\nCompétences : ${parseSkills(job.skills).join(', ')}\nDescription : ${job.description}`;
            explanation = await explainMatch(cvText, jobText, score, env.AI);
          }

          return { ...job, score, explanation };
        })
      );

      const sorted = matches
        .filter(Boolean)
        .sort((a: any, b: any) => b.score - a.score);

      return NextResponse.json({ cv, matches: sorted });
    }

    // ── Mode 2 : Trouver des candidats pour une offre ─────────────────────
    if (jobId) {
      const job = await env.DB.prepare('SELECT * FROM jobs WHERE id = ?').bind(jobId).first() as any;
      if (!job) return NextResponse.json({ error: 'Offre introuvable' }, { status: 404 });

      const jobText = [
        `Poste : ${job.title}`,
        `Entreprise : ${job.company}`,
        `Compétences : ${parseSkills(job.skills).join(', ')}`,
        `Description : ${job.description}`,
      ].filter(s => s.split(': ')[1]?.trim()).join('\n');

      const embedding = await generateEmbedding(jobText, env.AI);

      const vectorResults = await env.VECTORIZE_CVS.query(embedding, {
        topK: 8,
        returnMetadata: true,
      });

      const matches = await Promise.all(
        (vectorResults.matches || []).map(async (m: any) => {
          const cv = await env.DB.prepare('SELECT * FROM cvs WHERE id = ?').bind(m.id).first() as any;
          if (!cv) return null;

          const score = Math.round(m.score * 100);
          let explanation = null;

          if (withExplanation && score >= 40) {
            const cvText = `Candidat : ${cv.name}\nCompétences : ${parseSkills(cv.skills).join(', ')}\nProfil : ${cv.summary}`;
            explanation = await explainMatch(cvText, jobText, score, env.AI);
          }

          return { ...cv, score, explanation };
        })
      );

      const sorted = matches
        .filter(Boolean)
        .sort((a: any, b: any) => b.score - a.score);

      return NextResponse.json({ job, matches: sorted });
    }

    return NextResponse.json({ error: 'Fournis cvId ou jobId en paramètre.' }, { status: 400 });

  } catch (err: any) {
    console.error('[GET /api/match]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
