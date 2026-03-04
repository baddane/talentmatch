'use client';

import { useState, useEffect, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
type Job = { id: string; title: string; company: string; location: string; contract: string; description: string; skills: string; created_at: string; };
type CV  = { id: string; name: string; email: string; summary: string; skills: string; experience: string; education: string; created_at: string; };
type Match = (Job | CV) & { score: number; explanation?: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseSkills(s: string): string[] {
  try { return JSON.parse(s) || []; } catch { return []; }
}
function scoreClass(n: number) {
  return n >= 70 ? 'score-high' : n >= 45 ? 'score-mid' : 'score-low';
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Spinner() { return <span className="spin" />; }

function Alert({ type, msg }: { type: 'ok'|'err'; msg: string }) {
  return <div className={`alert alert-${type}`}>{type === 'ok' ? '✓' : '✗'} {msg}</div>;
}

function ScoreRing({ score }: { score: number }) {
  return <div className={`score-ring ${scoreClass(score)}`}>{score}%</div>;
}

function MatchCard({ item, type }: { item: Match; type: 'job'|'cv' }) {
  const title = type === 'job' ? (item as Job).title : (item as CV).name;
  const sub   = type === 'job'
    ? [(item as Job).company, (item as Job).location].filter(Boolean).join(' · ')
    : (item as CV).email;
  const skills = parseSkills(item.skills);

  return (
    <div className="match-card">
      <div className="match-card-top">
        <ScoreRing score={item.score} />
        <div className="match-card-info">
          <div className="match-title">{title}</div>
          {sub && <div className="match-sub">{sub}</div>}
        </div>
      </div>
      {skills.length > 0 && (
        <div className="tags">
          {skills.slice(0, 5).map(s => <span className="tag" key={s}>{s}</span>)}
        </div>
      )}
      <div className="match-bar">
        <div className="match-bar-fill" style={{ width: `${item.score}%` }} />
      </div>
      {item.explanation && (
        <div className="explain-box">
          <div className="explain-label">✦ Analyse IA</div>
          {item.explanation}
        </div>
      )}
    </div>
  );
}

// ─── TAB: MATCHING ────────────────────────────────────────────────────────────
function MatchTab() {
  const [mode, setMode] = useState<'cv'|'job'>('cv');
  const [cvs, setCVs]   = useState<CV[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selId, setSelId] = useState('');
  const [explain, setExplain] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ source: any; matches: Match[] } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/cvs').then(r=>r.json()).then(d=>setCVs(d.cvs||[]));
    fetch('/api/jobs').then(r=>r.json()).then(d=>setJobs(d.jobs||[]));
  }, []);

  const items = mode === 'cv' ? cvs : jobs;

  async function run() {
    if (!selId) return setError('Sélectionne un élément.');
    setLoading(true); setError(''); setResults(null);
    try {
      const param = mode === 'cv' ? `cvId=${selId}` : `jobId=${selId}`;
      const res = await fetch(`/api/match?${param}&explain=${explain}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResults({ source: data.cv || data.job, matches: data.matches });
    } catch(e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Matching <em>sémantique</em></h1>
        <p className="page-sub">Similarité vectorielle via Cloudflare Vectorize — comprend le sens, pas juste les mots-clés.</p>
      </div>

      <div className="two-col">
        {/* Controls */}
        <div>
          <div className="card">
            <p className="card-label">Mode de matching</p>
            <div style={{ display:'flex', gap:8, marginBottom:20 }}>
              {(['cv','job'] as const).map(m => (
                <button key={m} className={`btn btn-full ${mode===m?'btn-primary':'btn-ghost'}`}
                  onClick={() => { setMode(m); setSelId(''); setResults(null); }}>
                  {m==='cv' ? '👤 CV → Offres' : '📋 Offre → CVs'}
                </button>
              ))}
            </div>

            <div className="field" style={{ marginBottom:14 }}>
              <label>{mode==='cv' ? 'Candidat à matcher' : 'Offre à matcher'}</label>
              <select value={selId} onChange={e=>setSelId(e.target.value)}>
                <option value="">— Sélectionner —</option>
                {items.map(i => (
                  <option key={i.id} value={i.id}>
                    {mode==='cv' ? (i as CV).name : (i as Job).title}
                    {mode==='job' && (i as Job).company ? ` — ${(i as Job).company}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:'0.85rem', color:'var(--muted)', marginBottom:16, cursor:'pointer' }}>
              <input type="checkbox" checked={explain} onChange={e=>setExplain(e.target.checked)}
                style={{ width:16, height:16, accentColor:'var(--accent2)' }} />
              Générer une explication IA pour chaque match <span style={{color:'var(--accent3)',fontSize:'0.75rem'}}>(+lent)</span>
            </label>

            {error && <Alert type="err" msg={error} />}

            <button className="btn btn-primary btn-full" onClick={run} disabled={loading||!selId} style={{marginTop:4}}>
              {loading ? <><Spinner /> Calcul vectoriel...</> : '⬡ Lancer le matching'}
            </button>
          </div>

          {/* Selected preview */}
          {selId && (() => {
            const item = items.find(i=>i.id===selId);
            if (!item) return null;
            return (
              <div className="card" style={{marginTop:16}}>
                <p className="card-label">Profil sélectionné</p>
                <div className="item-name">{mode==='cv' ? (item as CV).name : (item as Job).title}</div>
                <div className="item-meta">
                  {mode==='cv' ? (item as CV).email : [(item as Job).company,(item as Job).location].filter(Boolean).join(' · ')}
                </div>
                <p className="item-desc">{(item as any).summary || (item as Job).description}</p>
                {parseSkills(item.skills).length > 0 && (
                  <div className="tags" style={{marginTop:10}}>
                    {parseSkills(item.skills).map(s=><span className="tag" key={s}>{s}</span>)}
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Results */}
        <div>
          <div className="list-header">
            <span className="list-title">Résultats</span>
            {results && <span className="list-count">{results.matches.length} matchs</span>}
          </div>

          {!results && !loading && (
            <div className="empty"><div className="empty-icon">🎯</div><p className="empty-text">Lance un matching pour voir les résultats.</p></div>
          )}
          {loading && (
            <div className="empty">
              <div style={{fontSize:'2rem',marginBottom:12,animation:'spin 1.5s linear infinite',display:'inline-block'}}>⬡</div>
              <p className="empty-text">Génération des embeddings &amp; requête Vectorize...</p>
            </div>
          )}
          {results?.matches.length === 0 && (
            <div className="empty"><div className="empty-icon">🔍</div><p className="empty-text">Aucun match — indexe plus de données.</p></div>
          )}
          {results && results.matches.length > 0 && (
            <>
              <div style={{
                background:'rgba(126,255,160,0.05)', border:'1px solid rgba(126,255,160,0.15)',
                borderRadius:10, padding:'12px 16px', marginBottom:14, fontSize:'0.82rem', color:'var(--muted)'
              }}>
                ✦ Meilleur match : <strong style={{color:'var(--accent)'}}>{results.matches[0].score}% de similarité</strong>
                {results.matches[0].score >= 80 && ' — Excellent'}
                {results.matches[0].score >= 60 && results.matches[0].score < 80 && ' — Bon profil'}
                {results.matches[0].score < 60 && ' — Profil partiel'}
              </div>
              <div className="list">
                {results.matches.map(m => (
                  <MatchCard key={m.id} item={m} type={mode==='cv'?'job':'cv'} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── TAB: JOBS ────────────────────────────────────────────────────────────────
function JobsTab() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{type:'ok'|'err';msg:string}|null>(null);
  const [form, setForm] = useState({ title:'', company:'', location:'', contract:'', description:'', skills:'' });

  const load = () => fetch('/api/jobs').then(r=>r.json()).then(d=>setJobs(d.jobs||[]));
  useEffect(() => { load(); }, []);

  const set = (f: string) => (e: any) => setForm(p=>({...p,[f]:e.target.value}));

  async function submit() {
    if (!form.title || !form.description) return setAlert({type:'err', msg:'Titre et description requis.'});
    setLoading(true); setAlert(null);
    try {
      const res = await fetch('/api/jobs', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ ...form, skills: form.skills.split(',').map(s=>s.trim()).filter(Boolean) })
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setAlert({type:'ok', msg:'Offre indexée avec succès !'});
      setForm({ title:'', company:'', location:'', contract:'', description:'', skills:'' });
      load();
    } catch(e:any) {
      setAlert({type:'err', msg:e.message});
    } finally { setLoading(false); }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Offres <em>d'emploi</em></h1>
        <p className="page-sub">Chaque offre est vectorisée et stockée dans Cloudflare Vectorize pour le matching sémantique.</p>
      </div>
      <div className="two-col">
        <div className="card">
          <p className="card-label">Nouvelle offre</p>
          <div className="form-grid">
            <div className="form-row">
              <div className="field"><label>Titre *</label><input value={form.title} onChange={set('title')} placeholder="Développeur Full-Stack Senior" /></div>
              <div className="field"><label>Entreprise</label><input value={form.company} onChange={set('company')} placeholder="Acme Corp" /></div>
            </div>
            <div className="form-row">
              <div className="field"><label>Localisation</label><input value={form.location} onChange={set('location')} placeholder="Paris / Remote / Casablanca" /></div>
              <div className="field"><label>Contrat</label>
                <select value={form.contract} onChange={set('contract')}>
                  <option value="">— Type de contrat —</option>
                  <option>CDI</option><option>CDD</option><option>Freelance</option>
                  <option>Stage</option><option>Alternance</option>
                </select>
              </div>
            </div>
            <div className="field"><label>Description *</label><textarea rows={5} value={form.description} onChange={set('description')} placeholder="Contexte du projet, responsabilités, profil attendu..." /></div>
            <div className="field"><label>Compétences (séparées par virgule)</label><input value={form.skills} onChange={set('skills')} placeholder="React, Node.js, TypeScript, PostgreSQL" /></div>
            {alert && <Alert {...alert} />}
            <button className="btn btn-primary btn-full" onClick={submit} disabled={loading}>
              {loading ? <><Spinner /> Indexation...</> : '⬡ Indexer l\'offre'}
            </button>
          </div>
        </div>

        <div>
          <div className="list-header">
            <span className="list-title">Offres indexées</span>
            <span className="list-count">{jobs.length}</span>
          </div>
          {jobs.length === 0
            ? <div className="empty"><div className="empty-icon">📋</div><p className="empty-text">Aucune offre indexée.</p></div>
            : <div className="list">{jobs.map(j=>(
              <div className="item" key={j.id}>
                <div className="item-name">{j.title}</div>
                <div className="item-meta">{[j.company, j.location, j.contract].filter(Boolean).join(' · ')}</div>
                <div className="item-desc">{j.description}</div>
                {parseSkills(j.skills).length>0 && <div className="tags" style={{marginTop:8}}>{parseSkills(j.skills).map(s=><span className="tag" key={s}>{s}</span>)}</div>}
              </div>
            ))}</div>
          }
        </div>
      </div>
    </div>
  );
}

// ─── TAB: CVs ─────────────────────────────────────────────────────────────────
function CVsTab() {
  const [cvs, setCVs] = useState<CV[]>([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{type:'ok'|'err';msg:string}|null>(null);
  const [pdfFile, setPdfFile] = useState<File|null>(null);
  const [drag, setDrag] = useState(false);
  const [form, setForm] = useState({ name:'', email:'', summary:'', skills:'', experience:'', education:'' });

  const load = () => fetch('/api/cvs').then(r=>r.json()).then(d=>setCVs(d.cvs||[]));
  useEffect(() => { load(); }, []);

  const set = (f: string) => (e: any) => setForm(p=>({...p,[f]:e.target.value}));

  async function submit() {
    if (!form.name) return setAlert({type:'err', msg:'Le nom est requis.'});
    if (!form.summary && !pdfFile) return setAlert({type:'err', msg:'Résumé ou PDF requis.'});
    setLoading(true); setAlert(null);

    try {
      let res: Response;
      if (pdfFile) {
        const fd = new FormData();
        fd.append('pdf', pdfFile);
        Object.entries(form).forEach(([k,v]) => fd.append(k, k==='skills' ? JSON.stringify(v.split(',').map((s:string)=>s.trim()).filter(Boolean)) : v));
        res = await fetch('/api/cvs', { method:'POST', body:fd });
      } else {
        res = await fetch('/api/cvs', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ ...form, skills: form.skills.split(',').map(s=>s.trim()).filter(Boolean) })
        });
      }
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setAlert({type:'ok', msg:'CV indexé avec succès !'});
      setForm({ name:'', email:'', summary:'', skills:'', experience:'', education:'' });
      setPdfFile(null);
      load();
    } catch(e:any) {
      setAlert({type:'err', msg:e.message});
    } finally { setLoading(false); }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Profils <em>candidats</em></h1>
        <p className="page-sub">Uploader un CV PDF ou remplir le formulaire — le profil sera vectorisé et indexé.</p>
      </div>
      <div className="two-col">
        <div className="card">
          <p className="card-label">Nouveau candidat</p>
          <div className="form-grid">
            {/* PDF Upload */}
            <div className="field">
              <label>CV PDF (optionnel)</label>
              {pdfFile
                ? <div className="upload-file">
                    <span>📄</span>
                    <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{pdfFile.name}</span>
                    <button className="btn btn-ghost" style={{padding:'4px 10px',fontSize:'0.75rem'}} onClick={()=>setPdfFile(null)}>✕</button>
                  </div>
                : <div className={`upload-zone ${drag?'drag':''}`}
                    onDragOver={e=>{e.preventDefault();setDrag(true)}}
                    onDragLeave={()=>setDrag(false)}
                    onDrop={e=>{e.preventDefault();setDrag(false);const f=e.dataTransfer.files[0];if(f?.type==='application/pdf')setPdfFile(f);}}>
                    <input type="file" accept=".pdf" onChange={e=>setPdfFile(e.target.files?.[0]||null)} />
                    <div className="upload-icon">📎</div>
                    <p className="upload-text"><strong>Glisse ton PDF ici</strong> ou clique pour choisir</p>
                  </div>
              }
            </div>

            <div className="form-row">
              <div className="field"><label>Nom complet *</label><input value={form.name} onChange={set('name')} placeholder="Yasmine Benali" /></div>
              <div className="field"><label>Email</label><input type="email" value={form.email} onChange={set('email')} placeholder="yasmine@example.com" /></div>
            </div>
            <div className="field"><label>Résumé professionnel {!pdfFile && '*'}</label>
              <textarea rows={3} value={form.summary} onChange={set('summary')} placeholder="Développeuse Full-Stack 5 ans d'exp, spécialisée React/Node.js..." />
            </div>
            <div className="field"><label>Compétences (virgule)</label><input value={form.skills} onChange={set('skills')} placeholder="React, TypeScript, Node.js, AWS" /></div>
            <div className="field"><label>Expérience</label>
              <textarea rows={2} value={form.experience} onChange={set('experience')} placeholder="Lead Dev @ Startup X (2021-2024) — equipe 4 devs, microservices..." />
            </div>
            <div className="field"><label>Formation</label><input value={form.education} onChange={set('education')} placeholder="Ingénieure ENSIAS 2019, Master IA 2021" /></div>

            {alert && <Alert {...alert} />}
            <button className="btn btn-primary btn-full" onClick={submit} disabled={loading}>
              {loading ? <><Spinner /> Indexation...</> : '⬡ Indexer le CV'}
            </button>
          </div>
        </div>

        <div>
          <div className="list-header">
            <span className="list-title">Candidats indexés</span>
            <span className="list-count">{cvs.length}</span>
          </div>
          {cvs.length === 0
            ? <div className="empty"><div className="empty-icon">👤</div><p className="empty-text">Aucun candidat indexé.</p></div>
            : <div className="list">{cvs.map(cv=>(
              <div className="item" key={cv.id}>
                <div className="item-name">{cv.name}</div>
                <div className="item-meta">{cv.email}</div>
                <div className="item-desc">{cv.summary}</div>
                {parseSkills(cv.skills).length>0 && <div className="tags" style={{marginTop:8}}>{parseSkills(cv.skills).map(s=><span className="tag" key={s}>{s}</span>)}</div>}
              </div>
            ))}</div>
          }
        </div>
      </div>
    </div>
  );
}

// ─── ROOT PAGE ────────────────────────────────────────────────────────────────
export default function Home() {
  const [tab, setTab] = useState<'match'|'jobs'|'cvs'>('match');

  return (
    <div>
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <div className="logo-mark">⬡</div>
            TalentMatch
          </div>
          <nav className="nav">
            {([['match','Matching'],['jobs','Offres'],['cvs','Candidats']] as const).map(([id,label])=>(
              <button key={id} className={`nav-btn ${tab===id?'active':''}`} onClick={()=>setTab(id)}>{label}</button>
            ))}
          </nav>
        </div>
      </header>

      <main className="main">
        {tab === 'match' && <MatchTab />}
        {tab === 'jobs'  && <JobsTab />}
        {tab === 'cvs'   && <CVsTab />}
      </main>
    </div>
  );
}
