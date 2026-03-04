import { NextRequest, NextResponse } from 'next/server';
import { getBindings, generateEmbedding } from '@/lib/cloudflare';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const env = getBindings();
    const body = await req.json();
    const { title, company, location, contract, description, skills } = body;

    if (!title || !description) {
      return NextResponse.json({ error: 'Le titre et la description sont requis.' }, { status: 400 });
    }

    const text = [
      `Poste : ${title}`,
      company ? `Entreprise : ${company}` : '',
      location ? `Localisation : ${location}` : '',
      contract ? `Contrat : ${contract}` : '',
      skills?.length ? `Compétences requises : ${skills.join(', ')}` : '',
      `Description : ${description}`,
    ].filter(Boolean).join('\n');

    const embedding = await generateEmbedding(text, env.AI);

    const jobId = crypto.randomUUID();
    await env.VECTORIZE_JOBS.upsert([{
      id: jobId,
      values: embedding,
      metadata: { title, company: company || '', location: location || '' },
    }]);

    await env.DB.prepare(
      `INSERT INTO jobs (id, title, company, location, contract, description, skills)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      jobId, title, company || '', location || '', contract || '',
      description, JSON.stringify(skills || [])
    ).run();

    return NextResponse.json({ success: true, id: jobId });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const env = getBindings();
    const result = await env.DB.prepare(
      'SELECT * FROM jobs ORDER BY created_at DESC'
    ).all();
    return NextResponse.json({ jobs: result.results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}