"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { SEASONS, STATUSES } from "@/lib/demo";
import { SubmitButton } from "@/components/SubmitButton";
import { Field, inputCls, secondaryBtnCls } from "@/components/ui";
import type { DemoFormState } from "./actions";

export type DemoFormOptions = {
  fiscalYears: { id: string; label: string }[];
  demoTypes: {
    id: string;
    name: string;
    fundingName: string;
    defaultAreaDec: string | null;
    defaultBudget: string | null;
  }[];
  crops: { id: string; name: string; varieties: { id: string; name: string }[] }[];
  unions: { id: string; name: string; blocks: { id: string; name: string; staffName: string | null }[] }[];
};

type Props = {
  action: (state: DemoFormState, fd: FormData) => Promise<DemoFormState>;
  options: DemoFormOptions;
  initial: Record<string, string>;
  submitLabel: string;
  cancelHref: string;
  lockFiscalYear?: boolean;
};

export function DemoForm({ action, options, initial, submitLabel, cancelHref, lockFiscalYear }: Props) {
  const [state, formAction] = useActionState(action, {} as DemoFormState);
  // ভুল হলে পাঠানো তথ্যগুলো ফেরত এনে ফর্মে আবার বসানো হয়, যাতে আবার টাইপ করতে না হয়
  const values = state.values ?? initial;

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <p role="alert" className="rounded-lg bg-[#f2e3df] px-4 py-2.5 text-[#8a2d1f]">
          {state.error}
        </p>
      )}
      <FormBody key={state.ts ?? 0} values={values} options={options} lockFiscalYear={lockFiscalYear} />
      <div className="flex max-w-md gap-3">
        <SubmitButton pendingText="সংরক্ষণ হচ্ছে…">{submitLabel}</SubmitButton>
        <Link href={cancelHref} className={secondaryBtnCls}>
          বাতিল
        </Link>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-xl border border-line bg-white p-5">
      <legend className="px-1 text-lg font-bold">{title}</legend>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </fieldset>
  );
}

function FormBody({
  values,
  options,
  lockFiscalYear,
}: {
  values: Record<string, string>;
  options: DemoFormOptions;
  lockFiscalYear?: boolean;
}) {
  const [cropId, setCropId] = useState(values.cropId ?? "");
  const [unionId, setUnionId] = useState(values.unionId ?? "");
  const [area, setArea] = useState(values.areaDecimal ?? "");
  const [budget, setBudget] = useState(values.budgetAmount ?? "");

  const varieties = options.crops.find((c) => c.id === cropId)?.varieties ?? [];
  const blocks = options.unions.find((u) => u.id === unionId)?.blocks ?? [];

  // খাত অনুযায়ী প্রদর্শনীর ধরনগুলো গ্রুপ করা
  const groups = new Map<string, DemoFormOptions["demoTypes"]>();
  for (const d of options.demoTypes) {
    groups.set(d.fundingName, [...(groups.get(d.fundingName) ?? []), d]);
  }

  function onDemoTypeChange(id: string) {
    const dt = options.demoTypes.find((d) => d.id === id);
    if (!dt) return;
    if (!area && dt.defaultAreaDec) setArea(dt.defaultAreaDec);
    if (!budget && dt.defaultBudget) setBudget(dt.defaultBudget);
  }

  const fyLabel = options.fiscalYears.find((f) => f.id === values.fiscalYearId)?.label ?? "";

  return (
    <>
      <Section title="প্রদর্শনী">
        <Field label="অর্থবছর *">
          {lockFiscalYear ? (
            <>
              <input type="hidden" name="fiscalYearId" value={values.fiscalYearId ?? ""} />
              <input value={fyLabel} readOnly className={`${inputCls} bg-paper`} aria-readonly="true" />
            </>
          ) : (
            <select name="fiscalYearId" required defaultValue={values.fiscalYearId ?? ""} className={inputCls}>
              <option value="" disabled>
                বেছে নিন
              </option>
              {options.fiscalYears.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="মৌসুম *">
          <select name="season" required defaultValue={values.season ?? ""} className={inputCls}>
            <option value="" disabled>
              বেছে নিন
            </option>
            {SEASONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="প্রদর্শনীর ধরন *" hint="খাত আপনাআপনি নির্ধারিত হবে">
          <select
            name="demoTypeId"
            required
            defaultValue={values.demoTypeId ?? ""}
            onChange={(e) => onDemoTypeChange(e.target.value)}
            className={inputCls}
          >
            <option value="" disabled>
              বেছে নিন
            </option>
            {[...groups.entries()].map(([funding, items]) => (
              <optgroup key={funding} label={funding}>
                {items.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>
        <Field label="ফসল *">
          <select
            name="cropId"
            required
            value={cropId}
            onChange={(e) => setCropId(e.target.value)}
            className={inputCls}
          >
            <option value="" disabled>
              বেছে নিন
            </option>
            {options.crops.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="জাত" hint={cropId && varieties.length === 0 ? "এই ফসলের জাত মাস্টার ডেটায় যোগ করা হয়নি" : undefined}>
          <select
            key={cropId}
            name="varietyId"
            defaultValue={cropId === values.cropId ? (values.varietyId ?? "") : ""}
            disabled={!cropId}
            className={inputCls}
          >
            <option value="">—</option>
            {varieties.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="প্রদর্শিত প্রযুক্তি">
          <input name="technology" defaultValue={values.technology ?? ""} className={inputCls} />
        </Field>
      </Section>

      <Section title="কৃষক">
        <Field label="কৃষকের নাম *">
          <input name="farmerName" required defaultValue={values.farmerName ?? ""} className={inputCls} />
        </Field>
        <Field label="পিতা / স্বামীর নাম">
          <input name="fatherName" defaultValue={values.fatherName ?? ""} className={inputCls} />
        </Field>
        <Field label="মোবাইল">
          <input name="mobile" type="tel" inputMode="tel" defaultValue={values.mobile ?? ""} className={inputCls} />
        </Field>
        <Field label="এনআইডি নম্বর" hint="একই এনআইডির কৃষক আগে থাকলে তার রেকর্ডেই যুক্ত হবে">
          <input name="nid" inputMode="numeric" defaultValue={values.nid ?? ""} className={inputCls} />
        </Field>
        <Field label="কৃষি কার্ড নম্বর">
          <input name="cardNo" defaultValue={values.cardNo ?? ""} className={inputCls} />
        </Field>
      </Section>

      <Section title="অবস্থান">
        <Field label="ইউনিয়ন / পৌরসভা *">
          <select
            name="unionId"
            required
            value={unionId}
            onChange={(e) => setUnionId(e.target.value)}
            className={inputCls}
          >
            <option value="" disabled>
              বেছে নিন
            </option>
            {options.unions.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="ব্লক *" hint={unionId && blocks.length === 0 ? "এই ইউনিয়নে কোনো ব্লক যোগ করা হয়নি" : undefined}>
          <select
            key={unionId}
            name="blockId"
            required
            defaultValue={unionId === values.unionId ? (values.blockId ?? "") : ""}
            disabled={!unionId}
            className={inputCls}
          >
            <option value="" disabled>
              বেছে নিন
            </option>
            {blocks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.staffName ? `${b.name} (${b.staffName})` : b.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="গ্রাম *">
          <input name="village" required defaultValue={values.village ?? ""} className={inputCls} />
        </Field>
        <Field label="দাগ / মৌজা">
          <input name="landDag" defaultValue={values.landDag ?? ""} className={inputCls} />
        </Field>
        <Field label="আয়তন (শতাংশ) *">
          <input
            name="areaDecimal"
            required
            inputMode="decimal"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className={inputCls}
          />
        </Field>
      </Section>

      <Section title="বাস্তবায়ন">
        <Field label="বরাদ্দ (টাকা)">
          <input
            name="budgetAmount"
            inputMode="decimal"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="স্থাপনের তারিখ">
          <input name="establishedDate" type="date" defaultValue={values.establishedDate ?? ""} className={inputCls} />
        </Field>
        <Field label="বপন / রোপণের তারিখ">
          <input name="sowingDate" type="date" defaultValue={values.sowingDate ?? ""} className={inputCls} />
        </Field>
        <Field label="অবস্থা *">
          <select name="status" defaultValue={values.status ?? "ESTABLISHED"} className={inputCls}>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <label className="flex min-h-11 items-center gap-2 self-end">
          <input
            type="checkbox"
            name="signboardPlaced"
            defaultChecked={values.signboardPlaced === "on"}
            className="size-5 accent-brand"
          />
          <span>সাইনবোর্ড স্থাপিত হয়েছে</span>
        </label>
        <div className="sm:col-span-2 lg:col-span-3">
          <Field label="মন্তব্য">
            <textarea
              name="remarks"
              rows={2}
              defaultValue={values.remarks ?? ""}
              className={`${inputCls} py-2`}
            />
          </Field>
        </div>
      </Section>
    </>
  );
}
