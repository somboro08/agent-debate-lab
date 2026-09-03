import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Streamdown } from "streamdown";
import { ArrowUpRight, Check, ChevronRight, CircleDashed, Download, FileText, Lightbulb, MessageSquare, PanelLeft, Pause, Play, Plus, Scale, Sparkles, Square, Target, Users } from "lucide-react";

const seedContext = "Nous voulons créer une plateforme qui aide les équipes non techniques à transformer une idée en projet testable, en quelques jours, sans perdre la nuance du problème initial.";
const seedObjective = "Établir un problème clair que le projet va résoudre";
type TranscriptItem = { speaker: string; role: string; tone: string; text: string };
type Agent = { name: string; role: string; expertise: string; creativity: number };
const initialAgents: Agent[] = [
  { name: "L’Orchestrateur", role: "orchestration", expertise: "synthèse et décision", creativity: 60 },
  { name: "L’Exploratrice", role: "exploration", expertise: "besoins et opportunités", creativity: 80 },
  { name: "Le Partenaire", role: "co-construction", expertise: "solutions et amélioration", creativity: 70 },
  { name: "La Gardienne", role: "vigilance", expertise: "alignement et critères", creativity: 40 },
];

export default function Home() {
  const [context, setContext] = useState(seedContext);
  const [objective, setObjective] = useState(seedObjective);
  const [projectName, setProjectName] = useState("Atelier Produit");
  const [objectives, setObjectives] = useState([seedObjective]);
  const [activeObjective, setActiveObjective] = useState(0);
  const [agents, setAgents] = useState(initialAgents);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [finale, setFinale] = useState<{ verdict: string; criterion: string; nextStep: string } | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const sessionKey = useState(() => `session-${crypto.randomUUID()}`)[0];
  const abortRef = useRef<AbortController | null>(null);
  const pausedRef = useRef(false);
  const saveSession = trpc.debate.save.useMutation();
  const history = trpc.debate.history.useQuery({ sessionKey }, { retry: false });

  useEffect(() => {
    if (history.data?.length) {
      const saved = history.data.map(item => item.title);
      setObjectives(saved);
      const current = history.data.find(item => item.status === "active") ?? history.data[history.data.length - 1];
      if (current) { setObjective(current.title); setActiveObjective(Math.max(0, saved.indexOf(current.title))); }
    }
  }, [history.data]);

  const runDebate = async () => {
    if (!context.trim() || !objective.trim() || isRunning) return;
    setIsRunning(true); setIsPaused(false); pausedRef.current = false; setTranscript([]); setFinale(null);
    const collected: TranscriptItem[] = [];
    const controller = new AbortController(); abortRef.current = controller;
    try {
      const response = await fetch("/api/debate/stream", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ context, objective, projectName, agents }), signal: controller.signal });
      if (!response.ok || !response.body) throw new Error("Flux SSE indisponible");
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
      while (true) {
        while (pausedRef.current) await new Promise(resolve => setTimeout(resolve, 180));
        const { value, done } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true }); const chunks = buffer.split("\n\n"); buffer = chunks.pop() || "";
        for (const chunk of chunks) {
          const line = chunk.split("\n").find(item => item.startsWith("data: ")); if (!line) continue;
          const event = JSON.parse(line.slice(6));
          if (event.type === "turn") { collected.push(event.turn); setTranscript(current => [...current, event.turn]); }
          if (event.type === "finale") { const result = { verdict: event.verdict, criterion: event.criterion, nextStep: event.nextStep }; setFinale(result); saveSession.mutate({ sessionKey, name: projectName, context, objective, verdict: result.verdict, criterion: result.criterion, turns: collected }); }
          if (event.type === "error") throw new Error(event.message);
        }
      }
      setObjectives(current => current.includes(objective) ? current : [...current, objective]);
    } catch (error) {
      if ((error as Error).name !== "AbortError") setTranscript(current => [...current, { speaker: "Système", role: "note", tone: "neutral", text: "La séance n’a pas pu démarrer. Vérifiez la configuration du modèle et réessayez." }]);
    } finally { setIsRunning(false); setIsPaused(false); pausedRef.current = false; abortRef.current = null; }
  };
  const togglePause = () => { const next = !isPaused; setIsPaused(next); pausedRef.current = next; };
  const stopDebate = () => { abortRef.current?.abort(); setIsRunning(false); setIsPaused(false); pausedRef.current = false; };
  const exportMarkdown = () => { const content = `# ${projectName}\n\n## Contexte\n${context}\n\n## Objectif\n${objective}\n\n## Transcription\n${transcript.map(item => `### ${item.speaker} — ${item.role}\n${item.text}`).join("\n\n")}\n\n## Résultat final\n${finale?.verdict ?? "Séance non conclue"}\n\n**Critère de réussite :** ${finale?.criterion ?? "—"}\n\n**Prochaine action :** ${finale?.nextStep ?? "—"}`; const url = URL.createObjectURL(new Blob([content], { type: "text/markdown;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = `${projectName.toLowerCase().replaceAll(" ", "-")}-synthese.md`; link.click(); URL.revokeObjectURL(url); };

  return <div className="min-h-screen bg-[#f7f7f4] text-[#1c1c1b]">
    <header className="h-16 border-b border-[#deded7] bg-[#fbfbf9] px-6 flex items-center justify-between sticky top-0 z-20 print:hidden"><div className="flex items-center gap-3"><div className="size-8 bg-[#20201e] text-[#f7d34b] rounded-lg grid place-items-center"><Scale className="size-4" /></div><span className="font-semibold tracking-tight">jury<span className="text-[#b49a16]">/</span>atelier</span></div><div className="flex items-center gap-5 text-sm text-[#777770]"><span className="hidden md:inline-flex items-center gap-2"><span className="size-2 rounded-full bg-[#55a878]" /> session persistante</span><Button variant="outline" size="sm" className="border-[#d7d7cf] bg-white"><Plus className="size-4" /> Nouveau projet</Button></div></header>
    <div className="flex"><aside className="hidden lg:flex w-64 shrink-0 border-r border-[#deded7] min-h-[calc(100vh-4rem)] bg-[#f2f2ed] p-4 flex-col print:hidden"><div className="text-[11px] uppercase tracking-[.16em] text-[#999990] px-3 mb-3">Espace de travail</div><nav className="space-y-1"><a className="flex items-center gap-3 rounded-lg bg-[#e4e4dc] px-3 py-2.5 text-sm font-medium"><PanelLeft className="size-4" /> Synthèse</a><a className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#777770]"><MessageSquare className="size-4" /> Transcription</a><a className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#777770]"><Target className="size-4" /> Objectifs</a></nav><div className="mt-auto rounded-xl bg-[#20201e] p-4 text-white"><div className="flex items-center gap-2 text-[#f7d34b] text-xs font-semibold"><Sparkles className="size-3.5" /> CONSEIL DU JURY</div><p className="text-sm leading-5 mt-3 text-[#e7e7df]">Un bon objectif se valide par un livrable observable, pas par une impression.</p></div></aside>
      <main className="flex-1 max-w-[1400px] mx-auto px-5 md:px-9 py-8 w-full"><div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-8"><div><div className="flex items-center gap-2 text-xs text-[#8b8b81] mb-3"><span>PROJETS</span><ChevronRight className="size-3" /><span className="text-[#1c1c1b]">{projectName}</span></div><h1 className="text-3xl md:text-[40px] font-semibold tracking-[-.04em]">Le studio de décision<span className="text-[#c2a321]">.</span></h1><p className="text-[#777770] mt-2 max-w-xl">Quatre rôles. Une conversation. Une idée qui devient plus solide.</p></div><Badge variant="outline" className="border-[#d7d7cf] bg-white px-3 py-1.5 font-normal"><CircleDashed className="size-3 mr-1.5 text-[#bb9e19]" /> {isRunning ? (isPaused ? "En pause" : "Séance en direct") : finale ? "Conclusion prête" : "En préparation"}</Badge></div>
        <div className="grid xl:grid-cols-[minmax(0,1fr)_390px] gap-6 items-start"><div className="space-y-6">
          <Card className="border-[#deded7] shadow-[0_8px_30px_rgba(30,30,20,.04)] bg-[#fffefa]"><CardHeader className="border-b border-[#e7e7df] pb-5"><div className="flex items-start justify-between"><div><div className="text-xs uppercase tracking-[.14em] text-[#9a9a8e] mb-2">Parcours du projet</div><CardTitle className="text-lg">Objectifs successifs</CardTitle></div><span className="text-xs text-[#a1a198]">{activeObjective + 1} / {objectives.length}</span></div></CardHeader><CardContent className="pt-4"><div className="space-y-2">{objectives.map((item, index) => <button key={`${item}-${index}`} onClick={() => { setActiveObjective(index); setObjective(item); }} className={`w-full text-left flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${activeObjective === index ? "bg-[#f3efcf] text-[#5f5008]" : "bg-[#f7f7f4] text-[#777770]"}`}><span className="size-5 rounded-full border border-current grid place-items-center text-[10px]">{index + 1}</span><span className="truncate">{item}</span>{finale && activeObjective === index && <Check className="size-4 ml-auto" />}</button>)}</div><Button variant="ghost" size="sm" className="mt-3 text-[#777770]" onClick={() => { const next = `Nouvel objectif ${objectives.length + 1}`; setObjectives(current => [...current, next]); setActiveObjective(objectives.length); setObjective(next); }}><Plus className="size-3.5" /> Ajouter un objectif</Button></CardContent></Card>
          <Card className="border-[#deded7] shadow-[0_8px_30px_rgba(30,30,20,.04)] bg-[#fffefa]"><CardHeader className="border-b border-[#e7e7df] pb-5"><div className="flex items-start justify-between"><div><div className="text-xs uppercase tracking-[.14em] text-[#9a9a8e] mb-2">Équipe de travail</div><CardTitle className="text-lg">Les quatre rôles</CardTitle></div><span className="text-xs text-[#a1a198]">personnalisable</span></div></CardHeader><CardContent className="pt-4 grid sm:grid-cols-2 gap-3">{agents.map((agent, index) => <div key={agent.role} className="rounded-lg border border-[#e7e7df] p-3"><Input value={agent.name} onChange={e => setAgents(current => current.map((item, i) => i === index ? { ...item, name: e.target.value } : item))} className="h-8 text-sm font-medium border-0 bg-[#f7f7f4] mb-2" /><Input value={agent.expertise} onChange={e => setAgents(current => current.map((item, i) => i === index ? { ...item, expertise: e.target.value } : item))} className="h-7 text-xs border-0 px-2 text-[#777770]" /><div className="flex items-center gap-2 mt-2"><span className="text-[10px] text-[#999990]">créativité</span><input type="range" min="0" max="100" value={agent.creativity} onChange={e => setAgents(current => current.map((item, i) => i === index ? { ...item, creativity: Number(e.target.value) } : item))} className="w-full accent-[#b49a16]" /></div></div>)}</CardContent></Card>
          <Card className="border-[#deded7] shadow-[0_8px_30px_rgba(30,30,20,.04)] bg-[#fffefa]"><CardHeader className="border-b border-[#e7e7df] pb-5"><div className="flex items-start justify-between"><div><div className="flex items-center gap-2 text-xs uppercase tracking-[.14em] text-[#9a9a8e] mb-2"><Lightbulb className="size-3.5 text-[#b49a16]" /> Brief commun</div><CardTitle className="text-lg">Ce que les agents doivent savoir</CardTitle></div><span className="text-xs text-[#a1a198]">01 / 03</span></div></CardHeader><CardContent className="pt-5"><label className="text-xs font-medium text-[#686860]">Nom du projet</label><Input value={projectName} onChange={e => setProjectName(e.target.value)} className="mt-2 mb-4 bg-white border-[#dcdcd3]" /><label className="text-xs font-medium text-[#686860]">Contexte, contraintes et informations utiles</label><Textarea value={context} onChange={e => setContext(e.target.value)} className="mt-2 min-h-[150px] resize-none bg-white border-[#dcdcd3] leading-6" /><div className="flex justify-between items-center mt-4 text-xs text-[#9a9a90]"><span>{context.length} caractères · sauvegardé pendant la séance</span><Button variant="ghost" size="sm" className="text-[#76766d]">Ajouter une source <ArrowUpRight className="size-3.5" /></Button></div></CardContent></Card>
          <Card className="border-[#deded7] shadow-[0_8px_30px_rgba(30,30,20,.04)] bg-[#fffefa]"><CardHeader className="border-b border-[#e7e7df] pb-5"><div className="flex items-start justify-between"><div><div className="flex items-center gap-2 text-xs uppercase tracking-[.14em] text-[#9a9a8e] mb-2"><Target className="size-3.5 text-[#b49a16]" /> Objectif actif</div><CardTitle className="text-lg">Sur quoi le jury doit travailler</CardTitle></div><Badge className="bg-[#f5edbf] text-[#77630c] hover:bg-[#f5edbf] border-0">Étape {activeObjective + 1}</Badge></div></CardHeader><CardContent className="pt-5"><Textarea value={objective} onChange={e => setObjective(e.target.value)} className="min-h-[108px] resize-none bg-white border-[#dcdcd3] text-base leading-6" /><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4"><p className="text-xs text-[#8e8e84] max-w-sm">Les agents s’entraident, posent des questions et vérifient l’alignement.</p><div className="flex gap-2"><Button onClick={runDebate} disabled={isRunning} className="bg-[#20201e] hover:bg-[#373733] text-white rounded-lg px-5">{isRunning ? <><span className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> En direct</> : <><Play className="size-3.5 fill-current" /> Lancer</>}</Button>{isRunning && <><Button variant="outline" size="icon" onClick={togglePause} title={isPaused ? "Reprendre" : "Mettre en pause"}>{isPaused ? <Play className="size-4" /> : <Pause className="size-4" />}</Button><Button variant="outline" size="icon" onClick={stopDebate} title="Arrêter"><Square className="size-4" /></Button></>}</div></div></CardContent></Card>
        </div>
        <Card className="border-[#deded7] shadow-[0_8px_30px_rgba(30,30,20,.04)] bg-[#fffefa] xl:sticky xl:top-24"><CardHeader className="border-b border-[#e7e7df] pb-5"><div className="flex items-start justify-between"><div><div className="flex items-center gap-2 text-xs uppercase tracking-[.14em] text-[#9a9a8e] mb-2"><Users className="size-3.5 text-[#b49a16]" /> Salle de collaboration</div><CardTitle className="text-lg">La discussion en direct</CardTitle></div><span className="text-xs text-[#a1a198]">{transcript.length ? `${transcript.length} tours` : "en attente"}</span></div></CardHeader><CardContent className="pt-5"><div className="space-y-5 max-h-[500px] overflow-auto pr-1">{transcript.length === 0 ? <div className="py-12 text-center"><div className="size-12 rounded-2xl bg-[#f3efcf] grid place-items-center mx-auto mb-4"><MessageSquare className="size-5 text-[#a68a11]" /></div><p className="text-sm font-medium">La salle attend votre brief</p><p className="text-xs text-[#999990] mt-2 leading-5">Lancez la séance pour voir les quatre rôles réfléchir et s’entraider.</p></div> : transcript.map((item, i) => <div key={i} className="flex gap-3"><div className={`size-8 rounded-full shrink-0 grid place-items-center text-xs font-semibold ${item.tone === "amber" ? "bg-[#f5edbf] text-[#78630a]" : item.tone === "green" ? "bg-[#dcefe1] text-[#39744f]" : item.tone === "violet" ? "bg-[#e9e1f5] text-[#6b4b8d]" : "bg-[#e8e8e1] text-[#66665e]"}`}>{item.speaker.slice(0, 1)}</div><div><div className="flex items-center gap-2"><span className="text-sm font-semibold">{item.speaker}</span><span className="text-[10px] uppercase tracking-wider text-[#aaa99f]">{item.role}</span></div><div className="text-sm text-[#5f5f58] leading-5 mt-1"><Streamdown>{item.text}</Streamdown></div></div></div>)}</div>{finale && <div className="border-t border-[#e7e7df] mt-5 pt-4 space-y-3"><div className="rounded-lg bg-[#eef6ed] p-3"><div className="text-[10px] uppercase tracking-wider text-[#4b8055] font-semibold mb-1">Résultat final</div><p className="text-sm font-medium leading-5">{finale.verdict}</p></div><div><div className="text-[10px] uppercase tracking-wider text-[#999990]">Critère de réussite</div><p className="text-xs text-[#5f5f58] mt-1">{finale.criterion}</p></div><div><div className="text-[10px] uppercase tracking-wider text-[#999990]">Prochaine action</div><p className="text-xs text-[#5f5f58] mt-1">{finale.nextStep}</p></div><div className="flex gap-2 pt-2 print:hidden"><Button variant="outline" size="sm" onClick={exportMarkdown}><Download className="size-3.5" /> Markdown</Button><Button variant="outline" size="sm" onClick={() => window.print()}><FileText className="size-3.5" /> PDF / imprimer</Button></div></div>}</CardContent></Card></div>
        <div className="mt-7 flex items-center gap-2 text-xs text-[#92928a] print:hidden"><Check className="size-3.5 text-[#5b9a70]" /> Projet et transcription sauvegardés automatiquement après chaque conclusion</div>
      </main>
    </div>
  </div>;
}
