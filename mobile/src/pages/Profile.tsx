import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Layout } from "../components/Layout";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { EmptyState, ErrorState, Skeleton } from "../components/StateViews";
import { useApp } from "../context/AppContext";
import { useMutation } from "../hooks/useQuery";
import { createFarmer } from "../api/client";
import { SOIL_TYPES } from "../api/types";
import type { CreateFarmerInput, Language, SoilType } from "../api/types";
import { Banknote, Calendar, MapPin, Plus, Sprout, User, Users } from "../components/icons";
import { daysUntil } from "../lib/format";

const LANGUAGES: Language[] = ["English", "Odia", "Hindi"];

const EMPTY_FORM: CreateFarmerInput = {
  name: "",
  phone: "",
  language: "English",
  district: "",
  state: "",
  village: "",
  primaryCrop: "",
  soilType: "Loamy",
  hasActiveLoan: false,
  loanDueDate: "",
  loanAmountRupees: undefined,
};

function validate(form: CreateFarmerInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (form.name.trim().length < 2) errors.name = "Name must be at least 2 characters.";
  if (form.phone.trim().length < 10 || form.phone.trim().length > 15) errors.phone = "Phone must be 10-15 characters.";
  if (form.district.trim().length < 2) errors.district = "District must be at least 2 characters.";
  if (form.state.trim().length < 2) errors.state = "State must be at least 2 characters.";
  if (form.village.trim().length < 2) errors.village = "Village must be at least 2 characters.";
  if (form.primaryCrop.trim().length < 2) errors.primaryCrop = "Primary crop must be at least 2 characters.";
  if (form.hasActiveLoan && !form.loanDueDate) errors.loanDueDate = "Loan due date is required.";
  return errors;
}

export function ProfilePage() {
  const { selectedFarmerId, selectedFarmer, selectFarmer, farmers, refetchFarmers } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateFarmerInput>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [mutation, runCreate] = useMutation(createFarmer);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const errors = validate(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const payload: CreateFarmerInput = {
      ...form,
      loanDueDate: form.hasActiveLoan ? form.loanDueDate : undefined,
      loanAmountRupees: form.hasActiveLoan ? form.loanAmountRupees : undefined,
    };
    const created = await runCreate(payload);
    if (created) {
      setForm(EMPTY_FORM);
      setShowForm(false);
      selectFarmer(created.id);
      refetchFarmers();
    }
  };

  return (
    <Layout title="Profile">
      {selectedFarmer && (
        <Card title="Farmer profile" icon={<User className="h-4 w-4" />} className="mb-3">
          <p className="text-lg font-bold text-soil-900">{selectedFarmer.name}</p>
          <p className="flex items-center gap-1 text-sm text-soil-600">
            <MapPin className="h-3.5 w-3.5" /> {selectedFarmer.village}, {selectedFarmer.district}, {selectedFarmer.state}
          </p>
          <p className="mt-1 text-sm text-soil-600">{selectedFarmer.phone} · {selectedFarmer.language}</p>
          <p className="mt-2 flex items-center gap-1 text-sm text-soil-700">
            <Sprout className="h-3.5 w-3.5" /> {selectedFarmer.primaryCrop} · {selectedFarmer.soilType} soil
          </p>
          {selectedFarmer.latitude === null && (
            <p className="mt-1 text-xs text-wheat-700">Location not resolved — weather/advisory will show as unavailable.</p>
          )}
          {selectedFarmer.hasActiveLoan && selectedFarmer.loanDueDate && (
            <p className="mt-2 flex items-center gap-1 text-xs text-wheat-700">
              <Calendar className="h-3.5 w-3.5" /> Loan due in {daysUntil(selectedFarmer.loanDueDate)} day(s)
              {selectedFarmer.loanAmountRupees ? ` · ₹${selectedFarmer.loanAmountRupees.toLocaleString("en-IN")}` : ""}
            </p>
          )}
        </Card>
      )}

      <Card
        title="All farmers"
        icon={<Users className="h-4 w-4" />}
        action={
          <button onClick={() => setShowForm((s) => !s)} aria-label="Register farmer" className="flex h-8 w-8 items-center justify-center rounded-full bg-leaf-600 text-white active:bg-leaf-700">
            <Plus className="h-4 w-4" />
          </button>
        }
        className="mb-3"
      >
        {farmers.status === "loading" && <Skeleton lines={3} />}
        {farmers.status === "error" && <ErrorState title="Could not load farmers" message={farmers.message} onRetry={refetchFarmers} />}
        {farmers.status === "success" && farmers.data.length === 0 && (
          <EmptyState title="No farmers yet" description="Tap + to register your first farmer." />
        )}
        {farmers.status === "success" && farmers.data.length > 0 && (
          <ul className="space-y-2">
            {farmers.data.map((farmer) => {
              const isSelected = farmer.id === selectedFarmerId;
              return (
                <li
                  key={farmer.id}
                  className={`flex items-center justify-between gap-2 rounded-lg border p-2.5 ${isSelected ? "border-leaf-300 bg-leaf-50" : "border-soil-100"}`}
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate text-sm font-medium text-soil-800">
                      {farmer.name} {isSelected && <Badge tone="leaf">Selected</Badge>}
                    </p>
                    <p className="truncate text-xs text-soil-500">{farmer.village}, {farmer.district}</p>
                  </div>
                  <Button variant={isSelected ? "ghost" : "secondary"} disabled={isSelected} onClick={() => selectFarmer(farmer.id)} className="shrink-0">
                    {isSelected ? "Selected" : "Select"}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {showForm && (
        <Card title="Register a farmer" icon={<Banknote className="h-4 w-4" />}>
          <form className="space-y-3" onSubmit={handleSubmit} noValidate>
            <Field label="Name" error={fieldErrors.name}>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass(!!fieldErrors.name)} />
            </Field>
            <Field label="Phone" error={fieldErrors.phone}>
              <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass(!!fieldErrors.phone)} />
            </Field>
            <Field label="Language">
              <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value as Language })} className={inputClass(false)}>
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </Field>
            <Field label="Village" error={fieldErrors.village}>
              <input value={form.village} onChange={(e) => setForm({ ...form, village: e.target.value })} className={inputClass(!!fieldErrors.village)} />
            </Field>
            <Field label="District" error={fieldErrors.district}>
              <input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} className={inputClass(!!fieldErrors.district)} />
            </Field>
            <Field label="State" error={fieldErrors.state}>
              <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className={inputClass(!!fieldErrors.state)} />
            </Field>
            <Field label="Primary crop" error={fieldErrors.primaryCrop}>
              <input placeholder="e.g. Paddy" value={form.primaryCrop} onChange={(e) => setForm({ ...form, primaryCrop: e.target.value })} className={inputClass(!!fieldErrors.primaryCrop)} />
            </Field>
            <Field label="Soil type">
              <select value={form.soilType} onChange={(e) => setForm({ ...form, soilType: e.target.value as SoilType })} className={inputClass(false)}>
                {SOIL_TYPES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
            <label className="flex items-center gap-2 text-sm text-soil-700">
              <input type="checkbox" checked={form.hasActiveLoan} onChange={(e) => setForm({ ...form, hasActiveLoan: e.target.checked })} className="h-4 w-4" />
              Has an active loan
            </label>
            {form.hasActiveLoan && (
              <Field label="Loan due date" error={fieldErrors.loanDueDate}>
                <input type="date" value={form.loanDueDate ?? ""} onChange={(e) => setForm({ ...form, loanDueDate: e.target.value })} className={inputClass(!!fieldErrors.loanDueDate)} />
              </Field>
            )}
            {mutation.status === "error" && (
              <ErrorState title="Could not register farmer" message={mutation.message ?? "Unknown error"} />
            )}
            <Button type="submit" fullWidth loading={mutation.status === "loading"} loadingLabel="Registering…">
              Register farmer
            </Button>
          </form>
        </Card>
      )}
    </Layout>
  );
}

function inputClass(hasError: boolean): string {
  return `w-full min-h-11 rounded-lg border px-3 py-2 text-sm focus:outline-none ${hasError ? "border-danger-600" : "border-soil-200 focus:border-leaf-500"}`;
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-soil-700">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-danger-600">{error}</p>}
    </div>
  );
}
