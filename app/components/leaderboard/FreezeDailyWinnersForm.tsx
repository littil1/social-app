"use client";

import { useState, useTransition } from "react";

export default function FreezeDailyWinnersForm() {
  const [date, setDate] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function runFreeze(targetDate?: string) {
    setMessage(null);
    setIsError(false);

    startTransition(async () => {
      try {
        const url = targetDate
          ? `/api/admin/daily-winners?date=${encodeURIComponent(targetDate)}`
          : "/api/admin/daily-winners";

        const response = await fetch(url, {
          method: "POST",
        });

        const text = await response.text();

        if (!response.ok) {
          setIsError(true);
          setMessage(text || "Daily Winners konnten nicht gespeichert werden.");
          return;
        }

        let result:
          | {
              winnerDate?: string;
              winners?: Array<{
                rank_position: number;
                post_id: number;
              }>;
              message?: string;
            }
          | null = null;

        try {
          result = JSON.parse(text);
        } catch {
          result = null;
        }

        const winnerDate = result?.winnerDate ?? targetDate ?? "gewählter Tag";
        const winnerCount = result?.winners?.length ?? 0;
        const infoText =
          result?.message ??
          `${winnerDate} erfolgreich eingefroren (${winnerCount} Gewinner gespeichert).`;

        setIsError(false);
        setMessage(infoText);
      } catch {
        setIsError(true);
        setMessage("Netzwerkfehler beim Speichern der Daily Winners.");
      }
    });
  }

  function handleFreezeYesterday() {
    runFreeze();
  }

  function handleFreezeSpecificDate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!date) {
      setIsError(true);
      setMessage("Bitte zuerst ein Datum auswählen.");
      return;
    }

    runFreeze(date);
  }

  return (
    <div className="rounded-xl border bg-white p-4 shadow">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-900">
          Admin: Tagesgewinner einfrieren
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Standardmässig wird der letzte abgeschlossene Tag gespeichert.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleFreezeYesterday}
          disabled={isPending}
          className="rounded-lg bg-black px-4 py-2 text-sm text-white disabled:opacity-60"
        >
          {isPending ? "Speichert..." : "Vortag einfrieren"}
        </button>
      </div>

      <form
        onSubmit={handleFreezeSpecificDate}
        className="mt-4 flex flex-wrap items-end gap-3"
      >
        <div>
          <label
            htmlFor="winner-date"
            className="mb-1 block text-sm text-gray-700"
          >
            Bestimmten Tag nachtragen
          </label>
          <input
            id="winner-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={isPending}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 disabled:opacity-60"
        >
          {isPending ? "Speichert..." : "Datum speichern"}
        </button>
      </form>

      {message && (
        <div
          className={`mt-4 rounded-lg px-3 py-2 text-sm ${
            isError
              ? "bg-red-50 text-red-700"
              : "bg-green-50 text-green-700"
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
}