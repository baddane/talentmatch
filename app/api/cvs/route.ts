import { NextRequest, NextResponse } from 'next/server';
import { getBindings, generateEmbedding } from '@/lib/cloudflare';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const env = getBindings();
    const contentType = req.headers.get('content-type') || '';

    let name = '', email = '', summary = '', skills: string[] = [],
        experience = '', education = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      name = formData.get('name') as string || '';
      email = formData.get('email') as string || '';
      skills = JSON.parse(formData.get('skills') as string || '[]');
      experience = formData.get('experience') as string || '';
      education = formData.get('education') as string || '';
      summary = formData.get('summary') as string || `Profil de ${name}. Expérience: ${experience}. Formation: ${education}.`;
    } else {
      const body = await req.json();
      ({ name, email, summary, skills, experience, education } = body);
    }

    if (!name || !summary) {
      return NextResponse.json({ error: 'Le nom et le résumé sont requis.' }, { status: 400 });
    }

    const text = [
      `Candidat : ${name}`,
      email ? `Email : ${email}` : '',
      skills?.length ? `Compétences : ${skills.join(', ')}` : '',
      experience ? `Expérience : ${experience}` : '',
      education ? `Formation : ${education}` : '',
      `Profil : ${summary}`,
    ].filter(Boolean).join('\n');

    const embedding = await generateEmbedding(text, env.AI);

    const cvId = crypto.randomUUID();
    await env.VECTORIZE_CVS.upsert([{
      id: cvId,
      values: embedding,
      metadata: { name, email: email || '' },
    }]);

    await env.DB.prepare(
      `INSERT INTO cvs (id, name, email, summary, skills, experience, education)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      cvId, name, email || '', summary,
      JSON.stringify(skills || []), experience || '', education || ''
    ).run();

    return NextResponse.json({ success: true, id: cvId });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const env = getBindings();
    const result = await env.DB.prepare(
      'SELECT * FROM cvs ORDER BY created_at DESC'
    ).all();
    return NextResponse.json({ cvs: result.results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}