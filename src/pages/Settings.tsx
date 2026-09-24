import { Download, KeyRound, RotateCcw, Smartphone, Sparkles, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ask } from "../components/Confirm";
import { Button, Card, PageTitle, inputClass } from "../components/ui";
import { emptyState, parseBackup, today } from "../lib/cellar";
import { demoState } from "../lib/demo";
import { plural } from "../lib/format";
import { getSample, sampleErrorMessage, saveFile } from "../lib/claude";
import { getApiKey, setApiKey } from "../lib/claudeApiKey";
import { setState, useCellar } from "../lib/store";
import { isEmbedded, isIos, isStandalone, useInstallPrompt } from "../pwa";

export default function SettingsPage() {
  const state = useCellar();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();
  const empty = state.wines.length === 0 && state.racks.length === 0;

  async function exportData() {
    const ok = await saveFile(`ma-cave-${today()}.json`, JSON.stringify(state, null, 2), "application/json");
    if (!ok) setMessage({ ok: false, text: "L'export n'a pas abouti." });
  }

  async function importData(file: File) {
    try {
      const next = parseBackup(await file.text());
      if (!empty && !(await ask("Remplacer toute ta cave actuelle par cette sauvegarde ?", "Remplacer"))) return;
      setState(next);
      setMessage({ ok: true, text: `Sauvegarde importée : ${plural(next.wines.length, "vin")}.` });
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Import impossible." });
    }
  }

  return (
    <div className="space-y-4">
      <PageTitle title="Réglages" />

      <InstallCard />
      {!isEmbedded() && <ClaudeKeyCard />}

      <Card>
        <h2 className="font-serif text-lg font-semibold">Sauvegarde</h2>
        <p className="mt-1 text-sm text-stone-600">
          Tes données sont enregistrées sur cet appareil, dans ce navigateur. Exporte-les régulièrement pour ne rien perdre
          ou pour les transférer sur un autre appareil.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={exportData} disabled={empty}><Download size={16} /> Exporter (JSON)</Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}><Upload size={16} /> Importer</Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importData(f);
              e.target.value = "";
            }}
          />
        </div>
        {message && (
          <p className={`mt-3 rounded-lg px-3 py-2 text-sm ring-1 ${message.ok ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-red-50 text-red-700 ring-red-200"}`}>
            {message.text}
          </p>
        )}
      </Card>

      <Card>
        <h2 className="font-serif text-lg font-semibold">Démonstration</h2>
        <p className="mt-1 text-sm text-stone-600">Charge une cave d'exemple (12 vins, 2 casiers, quelques dégustations) pour découvrir l'application.</p>
        <Button
          className="mt-3"
          variant="secondary"
          onClick={async () => {
            if (!empty && !(await ask("Remplacer ta cave actuelle par la cave d'exemple ?", "Remplacer"))) return;
            setState(demoState());
            navigate("/");
          }}
        >
          <Sparkles size={16} /> Charger la cave d'exemple
        </Button>
      </Card>

      <Card>
        <h2 className="font-serif text-lg font-semibold text-red-700">Zone sensible</h2>
        <p className="mt-1 text-sm text-stone-600">Efface tous les vins, casiers, mouvements et dégustations de cet appareil.</p>
        <Button
          className="mt-3"
          variant="danger"
          disabled={empty}
          onClick={async () => (await ask("Tout effacer ? Pense à exporter une sauvegarde avant.", "Tout effacer")) && setState(emptyState())}
        >
          <RotateCcw size={16} /> Tout effacer
        </Button>
      </Card>
      <p className="px-1 text-center text-xs text-stone-400">
        Version du {new Date(__BUILD_DATE__).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })}
      </p>
    </div>
  );
}

function InstallCard() {
  const { canPrompt, install } = useInstallPrompt();
  let body;
  if (isStandalone()) body = <p className="mt-1 text-sm text-stone-600">Ma Cave est installée sur cet appareil.</p>;
  else if (isEmbedded())
    body = (
      <p className="mt-1 text-sm text-stone-600">
        Tu utilises Ma Cave dans claude.ai. Pour l'avoir en icône sur l'écran d'accueil, ouvre la version hébergée de l'app,
        puis reviens ici.
      </p>
    );
  else if (canPrompt)
    body = (
      <>
        <p className="mt-1 text-sm text-stone-600">Ajoute Ma Cave à l'écran d'accueil : elle s'ouvre comme une app, même hors connexion.</p>
        <Button className="mt-3" onClick={install}><Smartphone size={16} /> Installer Ma Cave</Button>
      </>
    );
  else
    body = (
      <p className="mt-1 text-sm text-stone-600">
        {isIos()
          ? "Dans Safari, touche le bouton Partager puis « Sur l'écran d'accueil »."
          : "Dans le menu du navigateur, choisis « Installer l'application » ou « Ajouter à l'écran d'accueil »."}{" "}
        Ma Cave s'ouvrira comme une app, même hors connexion.
      </p>
    );
  return (
    <Card>
      <h2 className="font-serif text-lg font-semibold">Installer l'app</h2>
      {body}
    </Card>
  );
}

function ClaudeKeyCard() {
  const [saved, setSaved] = useState(() => !!getApiKey());
  const [draft, setDraft] = useState("");
  const [test, setTest] = useState<{ ok: boolean; text: string } | "running">();

  async function runTest() {
    setTest("running");
    try {
      const sample = await getSample();
      const r = await sample!.json<{ ok?: boolean }>('Réponds uniquement par ce JSON : {"ok": true}');
      setTest(r?.ok ? { ok: true, text: "Ça marche : Claude lira tes étiquettes et proposera ses accords." } : { ok: false, text: "Réponse inattendue, réessaie." });
    } catch (e) {
      setTest({ ok: false, text: sampleErrorMessage(e) });
    }
  }

  return (
    <Card>
      <h2 className="flex items-center gap-2 font-serif text-lg font-semibold"><KeyRound size={18} className="text-wine-600" /> Claude dans l'app</h2>
      <p className="mt-1 text-sm text-stone-600">
        Avec ta clé API Claude, l'app fait lire l'étiquette par Claude (domaine, cuvée, appellation, cépages et garde estimée)
        et active « Demander à Claude » dans les accords. Compte environ 2 à 5 centimes par étiquette, facturés sur ton compte API.
      </p>
      {saved ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={runTest} disabled={test === "running"}>{test === "running" ? "Test…" : "Tester"}</Button>
          <Button variant="danger" onClick={() => { setApiKey(null); setSaved(false); setTest(undefined); }}>Retirer la clé</Button>
        </div>
      ) : (
        <form
          className="mt-3 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim()) return;
            setApiKey(draft);
            setDraft("");
            setSaved(true);
            runTest();
          }}
        >
          <input
            id="claude-key"
            className={`${inputClass} min-w-0 flex-1 basis-56`}
            type="password"
            autoComplete="off"
            placeholder="sk-ant-…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <Button type="submit" disabled={!draft.trim()}>Enregistrer</Button>
        </form>
      )}
      {test && test !== "running" && (
        <p className={`mt-3 rounded-lg px-3 py-2 text-sm ring-1 ${test.ok ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-red-50 text-red-700 ring-red-200"}`}>{test.text}</p>
      )}
      <p className="mt-3 text-xs text-stone-500">
        Crée une clé sur console.anthropic.com (rubrique API Keys) et ajoute un peu de crédit. La clé reste sur ce téléphone,
        n'est envoyée qu'à Claude et ne figure pas dans tes exports.
      </p>
    </Card>
  );
}
