"use client";

import { ChangeEvent, FormEvent, useRef, useState } from "react";

type SourceItem = {
  filename: string;
  similarity: number;
};

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploaded, setUploaded] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("No document uploaded yet");
  const [uploading, setUploading] = useState(false);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null;
    setFile(selectedFile);
    if (selectedFile) {
      setUploadStatus(`Selected: ${selectedFile.name}`);
    }
  };

  const handleUpload = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!file) return;

    setUploading(true);
    setUploadStatus("Uploading and indexing your document...");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://127.0.0.1:8000/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Upload failed");
      }

      const data = await res.json();
      setUploadStatus(`Uploaded successfully — ${data.total_chunks} chunks processed.`);
      setUploaded(true);
    } catch (error) {
      console.error(error);
      setUploadStatus("Upload failed. Please try another PDF.");
    } finally {
      setUploading(false);
    }
  };

  const handleQuery = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setAnswer("");
    try {
      const res = await fetch("http://127.0.0.1:8000/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      if (!res.ok) {
        throw new Error("Query failed");
      }

      const data = await res.json();
      setAnswer(data.answer || "No answer returned.");
    } catch (error) {
      console.error(error);
      setAnswer("There was an issue retrieving the answer.");
    } finally {
      setLoading(false);
    }
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {!uploaded ? (
          <section className="flex min-h-[calc(100vh-110px)] items-center justify-center">
            <div className="w-full max-w-3xl rounded-[28px] border border-white/10 bg-[#0b0f1a] p-8 sm:p-10">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#111827] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.24em] text-slate-300">
                PDF to AI chat
              </div>

              <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Upload a document and start asking questions instantly.
              </h1>

              <p className="mt-4 max-w-xl text-base text-slate-300 sm:text-lg">
                Turn your PDFs into a searchable knowledge base. Upload once, then chat with your content in a clean AI workspace.
              </p>

              <div className="mt-8 rounded-3xl border border-dashed border-white/15 bg-[#0b1020] p-6 sm:p-8">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <div className="flex flex-col items-center justify-center gap-5 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-2xl text-black">
                    ⤴
                  </div>

                  <div>
                    <p className="text-lg font-medium text-white">Drop your PDF here</p>
                    <p className="mt-1 text-sm text-slate-400">or click below to browse files</p>
                  </div>

                  {file ? (
                    <div className="w-full max-w-md rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-left">
                      <p className="text-xs uppercase tracking-[0.18em] text-emerald-300">Selected file</p>
                      <p className="mt-2 truncate text-sm font-medium text-emerald-50">{file.name}</p>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={openFilePicker}
                      className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-slate-200"
                    >
                      Choose PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpload()}
                      disabled={!file || uploading}
                      className="rounded-full border border-white/10 bg-[#111827] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1a2334] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {uploading ? "Uploading..." : "Upload and chat"}
                    </button>
                  </div>

                  <p className="text-sm text-slate-400">{uploadStatus}</p>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="grid min-h-[calc(100vh-110px)] gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="rounded-[28px] border border-white/10 bg-[#0d1324] p-5">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Document</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">{file?.name ?? "Uploaded PDF"}</h2>
                </div>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-emerald-300">
                  Ready
                </span>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0b1020] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Status</p>
                <p className="mt-3 text-sm text-slate-200">{uploadStatus}</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setUploaded(false);
                  setAnswer("");
                  setSources([]);
                  setQuestion("");
                  setFile(null);
                  setUploadStatus("No document uploaded yet");
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="mt-6 w-full rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-100 transition hover:bg-[#1a2334]"
              >
                Upload another file
              </button>
            </aside>

            <div className="flex min-h-0 flex-col rounded-[28px] border border-white/10 bg-[#0a0f1f]">
              <div className="border-b border-white/10 px-6 py-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Chat</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Ask about your document</h2>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-6">
                {answer ? (
                  <>
                    <div className="ml-auto max-w-2xl rounded-2xl bg-white px-4 py-3 text-sm text-black">
                      {question}
                    </div>

                    <div className="max-w-3xl rounded-2xl border border-white/10 bg-[#0f172a] px-4 py-3 text-sm leading-7 text-slate-200">
                      <p className="whitespace-pre-wrap">{answer}</p>

                      {sources.length > 0 && (
                        <div className="mt-4 border-t border-white/10 pt-4">
                          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-400">Sources</p>
                          <ul className="space-y-2 text-slate-300">
                            {sources.map((source, index) => (
                              <li key={`${source.filename}-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-2">
                                <span className="truncate">{source.filename}</span>
                                <span className="text-xs text-slate-300">{(source.similarity * 100).toFixed(1)}%</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <div className="max-w-lg text-center text-slate-400">
                      <p className="text-lg text-white">Your document is ready.</p>
                      <p className="mt-2">Ask a question to get a grounded answer based on the uploaded content.</p>
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleQuery} className="border-t border-white/10 p-4">
                <div className="flex gap-3 rounded-2xl border border-white/10 bg-[#0d1324] p-2">
                  <input
                    type="text"
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    placeholder="Ask a question about this PDF..."
                    className="flex-1 bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500"
                  />
                  <button
                    type="submit"
                    disabled={loading || !question.trim()}
                    className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? "Thinking..." : "Send"}
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
