import type { FieldDay, HarvestResult, InputDistribution, Inspection, Photo } from "@prisma/client";
import { formatDateBn, toBn } from "@/lib/format";
import { CROP_CONDITIONS, INPUT_UNITS, YIELD_UNITS, photoStageLabel } from "@/lib/demo";
import { SubmitButton } from "@/components/SubmitButton";
import { Field, inputCls, smallBtnCls } from "@/components/ui";
import {
  addFieldDay,
  addInput,
  addInspection,
  deleteFieldDay,
  deleteInput,
  deleteInspection,
  deletePhoto,
  saveResult,
  uploadPhoto,
} from "../record-actions";
import { PhotoUpload } from "./PhotoUpload";

const today = () => new Date().toISOString().slice(0, 10);
const iso = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");
const n = (v: { toString(): string } | null | undefined) => (v == null ? "" : v.toString());

function SectionCard({
  id,
  title,
  meta,
  children,
}: {
  id: string;
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 break-inside-avoid rounded-xl border border-line bg-white p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-bold">{title}</h2>
        {meta && <span className="text-sm text-muted">{meta}</span>}
      </div>
      {children}
    </section>
  );
}

function AddBox({ label, open, children }: { label: string; open?: boolean; children: React.ReactNode }) {
  return (
    <details open={open} className="mt-4 rounded-lg border border-line px-4 py-3 print:hidden">
      <summary className="cursor-pointer font-semibold text-brand">{label}</summary>
      {children}
    </details>
  );
}

function DeleteButton({
  action,
  id,
  demoId,
}: {
  action: (fd: FormData) => Promise<void>;
  id: string;
  demoId: string;
}) {
  return (
    <form action={action} className="print:hidden">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="demonstrationId" value={demoId} />
      <button type="submit" className={smallBtnCls}>
        মুছুন
      </button>
    </form>
  );
}

// ---------------------------------------------------------------
// উপকরণ বিতরণ
// ---------------------------------------------------------------

export function InputsSection({ demoId, items }: { demoId: string; items: InputDistribution[] }) {
  return (
    <SectionCard id="inputs" title="উপকরণ বিতরণ" meta={items.length ? `${toBn(items.length)}টি উপকরণ` : undefined}>
      {items.length === 0 ? (
        <p className="text-muted">কোনো উপকরণ বিতরণের তথ্য যোগ করা হয়নি।</p>
      ) : (
        <ul className="divide-y divide-[#f0ece0]">
          {items.map((i) => (
            <li key={i.id} className="flex min-h-12 items-center gap-3 py-1.5">
              <span className="flex-1 font-medium">{i.itemName}</span>
              <span>
                {toBn(i.quantity.toString())} {i.unit}
              </span>
              <span className="w-36 text-sm text-muted">{i.distributedOn ? formatDateBn(i.distributedOn) : "—"}</span>
              <DeleteButton action={deleteInput} id={i.id} demoId={demoId} />
            </li>
          ))}
        </ul>
      )}
      <AddBox label="+ উপকরণ যোগ করুন">
        <form action={addInput} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="demonstrationId" value={demoId} />
          <div className="sm:col-span-2">
            <Field label="উপকরণ *" hint="যেমন: বীজ, ইউরিয়া, টিএসপি, বালাইনাশক">
              <input name="itemName" required className={inputCls} />
            </Field>
          </div>
          <Field label="পরিমাণ *">
            <input name="quantity" required inputMode="decimal" className={inputCls} />
          </Field>
          <Field label="একক *">
            <select name="unit" defaultValue="কেজি" className={inputCls}>
              {INPUT_UNITS.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </Field>
          <Field label="বিতরণের তারিখ">
            <input name="distributedOn" type="date" defaultValue={today()} className={inputCls} />
          </Field>
          <Field label="মন্তব্য">
            <input name="remarks" className={inputCls} />
          </Field>
          <div className="sm:col-span-2">
            <SubmitButton pendingText="সংরক্ষণ হচ্ছে…">উপকরণ যোগ করুন</SubmitButton>
          </div>
        </form>
      </AddBox>
    </SectionCard>
  );
}

// ---------------------------------------------------------------
// পরিদর্শন
// ---------------------------------------------------------------

export function InspectionsSection({
  demoId,
  items,
  userName,
  userDesignation,
}: {
  demoId: string;
  items: Inspection[];
  userName: string;
  userDesignation: string;
}) {
  return (
    <SectionCard id="inspections" title="পরিদর্শন" meta={items.length ? `${toBn(items.length)} বার` : undefined}>
      {items.length === 0 ? (
        <p className="text-muted">এখনো কোনো পরিদর্শন যোগ করা হয়নি।</p>
      ) : (
        <ol className="space-y-1">
          {items.map((v) => (
            <li key={v.id} className="grid grid-cols-[14px_1fr_auto] gap-3">
              <div className="flex flex-col items-center pt-2">
                <span className="size-2.5 rounded-full bg-ochre" />
                <span className="mt-1 w-0.5 flex-1 bg-line" />
              </div>
              <div className="pb-3">
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <span className="font-semibold">{formatDateBn(v.inspectedOn)}</span>
                  {v.cropStage && <span className="text-sm text-muted">{v.cropStage}</span>}
                  {v.condition && <span className="text-sm text-muted">অবস্থা: {v.condition}</span>}
                </div>
                <div className="text-sm text-[#4a5249]">
                  {v.inspectorName}
                  {v.designation && `, ${v.designation}`}
                </div>
                {v.comment && <p className="mt-0.5">{v.comment}</p>}
              </div>
              <DeleteButton action={deleteInspection} id={v.id} demoId={demoId} />
            </li>
          ))}
        </ol>
      )}
      <AddBox label="+ পরিদর্শন যোগ করুন">
        <form action={addInspection} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="demonstrationId" value={demoId} />
          <Field label="তারিখ *">
            <input name="inspectedOn" type="date" required defaultValue={today()} className={inputCls} />
          </Field>
          <Field label="ফসলের পর্যায়" hint="যেমন: কুশি, ফুল, দানা গঠন">
            <input name="cropStage" className={inputCls} />
          </Field>
          <Field label="পরিদর্শনকারী *">
            <input name="inspectorName" required defaultValue={userName} className={inputCls} />
          </Field>
          <Field label="পদবি">
            <input name="designation" defaultValue={userDesignation} className={inputCls} />
          </Field>
          <Field label="ফসলের অবস্থা">
            <select name="condition" defaultValue="" className={inputCls}>
              <option value="">—</option>
              {CROP_CONDITIONS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="মন্তব্য / পরামর্শ">
              <textarea name="comment" rows={2} className={`${inputCls} py-2`} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <SubmitButton pendingText="সংরক্ষণ হচ্ছে…">পরিদর্শন যোগ করুন</SubmitButton>
          </div>
        </form>
      </AddBox>
    </SectionCard>
  );
}

// ---------------------------------------------------------------
// ছবি
// ---------------------------------------------------------------

export function PhotosSection({
  demoId,
  photos,
  urls,
}: {
  demoId: string;
  photos: Photo[];
  urls: Record<string, string>;
}) {
  return (
    <SectionCard id="photos" title="ছবি" meta={photos.length ? `${toBn(photos.length)}টি` : undefined}>
      {photos.length === 0 ? (
        <p className="text-muted">কোনো ছবি যোগ করা হয়নি।</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((p) => {
            const url = urls[p.storagePath];
            return (
              <li key={p.id} className="flex flex-col gap-1">
                {url ? (
                  <a href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg bg-paper">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={p.caption || photoStageLabel(p.stage)}
                      loading="lazy"
                      className="aspect-[4/3] w-full object-cover"
                    />
                  </a>
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-paper text-sm text-muted">
                    ছবি লোড হয়নি
                  </div>
                )}
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm">
                    <div className="font-medium">{photoStageLabel(p.stage)}</div>
                    {p.caption && <div className="text-muted">{p.caption}</div>}
                    {p.takenOn && <div className="text-muted">{formatDateBn(p.takenOn)}</div>}
                  </div>
                  <DeleteButton action={deletePhoto} id={p.id} demoId={demoId} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <AddBox label="+ ছবি যোগ করুন">
        <PhotoUpload demonstrationId={demoId} upload={uploadPhoto} />
      </AddBox>
    </SectionCard>
  );
}

// ---------------------------------------------------------------
// কর্তন ও ফলাফল
// ---------------------------------------------------------------

export function ResultSection({ demoId, result }: { demoId: string; result: HarvestResult | null }) {
  const demoY = result ? Number(result.demoYield) : 0;
  const ctrlY = result?.controlYield ? Number(result.controlYield) : 0;
  const increase = result && ctrlY > 0 ? ((demoY - ctrlY) / ctrlY) * 100 : null;
  const cost = result?.productionCost ? Number(result.productionCost) : 0;
  const bcr = result?.grossReturn && cost > 0 ? Number(result.grossReturn) / cost : null;

  return (
    <SectionCard
      id="result"
      title="কর্তন ও ফলাফল"
      meta={result ? `কর্তন: ${formatDateBn(result.harvestDate)}` : undefined}
    >
      {result ? (
        <>
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-brand p-4 text-white sm:grid-cols-4">
            <div>
              <div className="text-sm text-[#d4e4da]">প্রদর্শনী প্লট</div>
              <div className="text-2xl font-bold">{toBn(result.demoYield.toString())}</div>
              <div className="text-xs text-[#d4e4da]">{result.yieldUnit}</div>
            </div>
            <div>
              <div className="text-sm text-[#d4e4da]">পার্শ্ববর্তী জমি</div>
              <div className="text-2xl font-bold">{result.controlYield ? toBn(result.controlYield.toString()) : "—"}</div>
              <div className="text-xs text-[#d4e4da]">{result.yieldUnit}</div>
            </div>
            <div>
              <div className="text-sm text-[#d4e4da]">ফলন বৃদ্ধি</div>
              <div className="text-2xl font-bold text-[#f5d38a]">
                {increase === null ? "—" : `${toBn(increase.toFixed(1))}%`}
              </div>
            </div>
            <div>
              <div className="text-sm text-[#d4e4da]">আয়-ব্যয় অনুপাত</div>
              <div className="text-2xl font-bold">{bcr === null ? "—" : toBn(bcr.toFixed(2))}</div>
            </div>
          </div>
          {(result.farmerOpinion || result.officerComment) && (
            <div className="mt-3 space-y-1">
              {result.farmerOpinion && <p>কৃষকের মতামত: {result.farmerOpinion}</p>}
              {result.officerComment && <p>কর্মকর্তার মন্তব্য: {result.officerComment}</p>}
            </div>
          )}
        </>
      ) : (
        <p className="text-muted">কর্তনের পর ফলাফল দিন। দিলে অবস্থা আপনাআপনি “কর্তন সম্পন্ন” হবে।</p>
      )}

      <AddBox label={result ? "ফলাফল সম্পাদনা" : "+ ফলাফল যোগ করুন"}>
        <form action={saveResult} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="demonstrationId" value={demoId} />
          <Field label="কর্তনের তারিখ *">
            <input
              name="harvestDate"
              type="date"
              required
              defaultValue={iso(result?.harvestDate) || today()}
              className={inputCls}
            />
          </Field>
          <Field label="ফলনের একক">
            <select name="yieldUnit" defaultValue={result?.yieldUnit ?? "টন/হেক্টর"} className={inputCls}>
              {YIELD_UNITS.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </Field>
          <Field label="প্রদর্শনী প্লটের ফলন *">
            <input name="demoYield" required inputMode="decimal" defaultValue={n(result?.demoYield)} className={inputCls} />
          </Field>
          <Field label="পার্শ্ববর্তী জমির ফলন" hint="দিলে ফলন বৃদ্ধির হার হিসাব হবে">
            <input name="controlYield" inputMode="decimal" defaultValue={n(result?.controlYield)} className={inputCls} />
          </Field>
          <Field label="উৎপাদন খরচ (টাকা/হেক্টর)">
            <input
              name="productionCost"
              inputMode="decimal"
              defaultValue={n(result?.productionCost)}
              className={inputCls}
            />
          </Field>
          <Field label="মোট আয় (টাকা/হেক্টর)">
            <input name="grossReturn" inputMode="decimal" defaultValue={n(result?.grossReturn)} className={inputCls} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="কৃষকের মতামত">
              <textarea
                name="farmerOpinion"
                rows={2}
                defaultValue={result?.farmerOpinion ?? ""}
                className={`${inputCls} py-2`}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="কর্মকর্তার মন্তব্য">
              <textarea
                name="officerComment"
                rows={2}
                defaultValue={result?.officerComment ?? ""}
                className={`${inputCls} py-2`}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <SubmitButton pendingText="সংরক্ষণ হচ্ছে…">ফলাফল সংরক্ষণ করুন</SubmitButton>
          </div>
        </form>
      </AddBox>
    </SectionCard>
  );
}

// ---------------------------------------------------------------
// মাঠ দিবস
// ---------------------------------------------------------------

export function FieldDaySection({ demoId, items }: { demoId: string; items: FieldDay[] }) {
  return (
    <SectionCard id="fieldday" title="মাঠ দিবস">
      {items.length === 0 ? (
        <p className="text-muted">কোনো মাঠ দিবসের তথ্য যোগ করা হয়নি।</p>
      ) : (
        <ul className="divide-y divide-[#f0ece0]">
          {items.map((f) => (
            <li key={f.id} className="flex items-start gap-3 py-2">
              <div className="flex-1">
                <div className="font-semibold">{formatDateBn(f.heldOn)}</div>
                <div className="text-sm">
                  অংশগ্রহণকারী: পুরুষ {toBn(f.maleParticipants)}, মহিলা {toBn(f.femaleParticipants)} — মোট{" "}
                  {toBn(f.maleParticipants + f.femaleParticipants)} জন
                </div>
                {(f.chiefGuest || f.chairperson) && (
                  <div className="text-sm text-muted">
                    {f.chiefGuest && `প্রধান অতিথি: ${f.chiefGuest}`}
                    {f.chiefGuest && f.chairperson && " · "}
                    {f.chairperson && `সভাপতি: ${f.chairperson}`}
                  </div>
                )}
                {f.remarks && <p className="text-sm">{f.remarks}</p>}
              </div>
              <DeleteButton action={deleteFieldDay} id={f.id} demoId={demoId} />
            </li>
          ))}
        </ul>
      )}
      <AddBox label="+ মাঠ দিবস যোগ করুন">
        <form action={addFieldDay} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="demonstrationId" value={demoId} />
          <div className="sm:col-span-2">
            <Field label="তারিখ *">
              <input name="heldOn" type="date" required defaultValue={today()} className={inputCls} />
            </Field>
          </div>
          <Field label="পুরুষ অংশগ্রহণকারী">
            <input name="maleParticipants" inputMode="numeric" defaultValue="0" className={inputCls} />
          </Field>
          <Field label="মহিলা অংশগ্রহণকারী">
            <input name="femaleParticipants" inputMode="numeric" defaultValue="0" className={inputCls} />
          </Field>
          <Field label="প্রধান অতিথি">
            <input name="chiefGuest" className={inputCls} />
          </Field>
          <Field label="সভাপতি">
            <input name="chairperson" className={inputCls} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="মন্তব্য">
              <input name="remarks" className={inputCls} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <SubmitButton pendingText="সংরক্ষণ হচ্ছে…">মাঠ দিবস যোগ করুন</SubmitButton>
          </div>
        </form>
      </AddBox>
    </SectionCard>
  );
}
