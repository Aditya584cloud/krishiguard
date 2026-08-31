import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { createFarmer } from "../api/client";
import { SOIL_TYPES } from "../api/types";
import type { CreateFarmerInput, Language, SoilType } from "../api/types";
import { useApp } from "../context/AppContext";
import { useMutation } from "../hooks/useQuery";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { EmptyState, ErrorState, Skeleton } from "../components/StateViews";
import { PageHeader } from "../components/PageHeader";
import { Banknote, Calendar, MapPin, Sprout, Users } from "../components/icons";

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
  if (form.phone.trim().length < 10 || form.phone.trim().length > 15) {
    errors.phone = "Phone must be between 10 and 15 characters.";
  }
  if (form.district.trim().length < 2) errors.district = "District must be at least 2 characters.";
  if (form.state.trim().length < 2) errors.state = "State must be at least 2 characters.";
  if (form.village.trim().length < 2) errors.village = "Village must be at least 2 characters.";
  if (form.primaryCrop.trim().length < 2) errors.primaryCrop = "Primary crop must be at least 2 characters.";
  if (form.hasActiveLoan && !form.loanDueDate) {
    errors.loanDueDate = "Loan due date is required when an active loan is recorded.";
  }
  return errors;
}

function daysUntil(dateStr: string): number {
  const ms = new Date(dateStr).getTime() - Date.now();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

export function FarmersPage() {
  const { selectedFarmerId, selectFarmer, farmers, refetchFarmers } = useApp();

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
      selectFarmer(created.id);
      refetchFarmers();
    }
  };

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Farmers"
        description="Register a farmer's identity, agricultural profile and (demo) financial context once — everything else is derived automatically."
        icon={<Users className="h-5 w-5" />}
      />

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <Card title="Register a farmer">
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <Field label="Name" htmlFor="name" error={fieldErrors.name}>
              <input
                id="name"
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputClass(!!fieldErrors.name)}
                aria-invalid={!!fieldErrors.name}
              />
            </Field>

            <Field label="Phone" htmlFor="phone" error={fieldErrors.phone}>
              <input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={inputClass(!!fieldErrors.phone)}
                aria-invalid={!!fieldErrors.phone}
              />
            </Field>

            <Field label="Language" htmlFor="language">
              <select
                id="language"
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value as Language })}
                className={inputClass(false)}
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Village" htmlFor="village" error={fieldErrors.village}>
              <input
                id="village"
                type="text"
                value={form.village}
                onChange={(e) => setForm({ ...form, village: e.target.value })}
                className={inputClass(!!fieldErrors.village)}
                aria-invalid={!!fieldErrors.village}
              />
            </Field>

            <Field label="District" htmlFor="district" error={fieldErrors.district}>
              <input
                id="district"
                type="text"
                value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
                className={inputClass(!!fieldErrors.district)}
                aria-invalid={!!fieldErrors.district}
              />
            </Field>

            <Field label="State" htmlFor="state" error={fieldErrors.state}>
              <input
                id="state"
                type="text"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className={inputClass(!!fieldErrors.state)}
                aria-invalid={!!fieldErrors.state}
              />
            </Field>

            <div className="border-t border-soil-100 pt-4">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-soil-500">
                <Sprout className="h-3.5 w-3.5" /> Agricultural profile
              </p>

              <Field label="Primary crop" htmlFor="primaryCrop" error={fieldErrors.primaryCrop}>
                <input
                  id="primaryCrop"
                  type="text"
                  placeholder="e.g. Paddy"
                  value={form.primaryCrop}
                  onChange={(e) => setForm({ ...form, primaryCrop: e.target.value })}
                  className={inputClass(!!fieldErrors.primaryCrop)}
                  aria-invalid={!!fieldErrors.primaryCrop}
                />
              </Field>

              <div className="mt-4">
                <Field label="Soil type" htmlFor="soilType">
                  <select
                    id="soilType"
                    value={form.soilType}
                    onChange={(e) => setForm({ ...form, soilType: e.target.value as SoilType })}
                    className={inputClass(false)}
                  >
                    {SOIL_TYPES.map((soil) => (
                      <option key={soil} value={soil}>
                        {soil}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>

            <div className="border-t border-soil-100 pt-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-soil-500">
                  <Banknote className="h-3.5 w-3.5" /> Financial profile{" "}
                  <span className="normal-case text-soil-500">(demo data)</span>
                </p>
                <label className="flex items-center gap-2 text-sm text-soil-700">
                  <input
                    type="checkbox"
                    checked={form.hasActiveLoan}
                    onChange={(e) => setForm({ ...form, hasActiveLoan: e.target.checked })}
                    className="h-4 w-4 rounded border-soil-200 text-leaf-600 focus:ring-leaf-500"
                  />
                  Has an active loan
                </label>
              </div>

              {form.hasActiveLoan && (
                <div className="space-y-4">
                  <Field label="Loan due date" htmlFor="loanDueDate" error={fieldErrors.loanDueDate}>
                    <input
                      id="loanDueDate"
                      type="date"
                      value={form.loanDueDate ?? ""}
                      onChange={(e) => setForm({ ...form, loanDueDate: e.target.value })}
                      className={inputClass(!!fieldErrors.loanDueDate)}
                      aria-invalid={!!fieldErrors.loanDueDate}
                    />
                  </Field>
                  <Field label="Outstanding amount (₹, optional)" htmlFor="loanAmountRupees">
                    <input
                      id="loanAmountRupees"
                      type="number"
                      min={0}
                      value={form.loanAmountRupees ?? ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          loanAmountRupees: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      className={inputClass(false)}
                    />
                  </Field>
                  <p className="text-xs text-soil-500">
                    This is simulated/demo financial data for the prototype — no real bank or
                    government financial record is accessed. Days-to-due-date is calculated
                    automatically from this date; you never need to type it in.
                  </p>
                </div>
              )}
            </div>

            {mutation.status === "error" && (
              <ErrorState
                title="Could not register farmer"
                message={mutation.message ?? "Unable to create farmer."}
              />
            )}

            <Button type="submit" loading={mutation.status === "loading"} loadingLabel="Registering…" fullWidth>
              Register farmer
            </Button>
          </form>
        </Card>

        <Card title="Registered farmers" icon={<Users className="h-4 w-4" />}>
          {farmers.status === "loading" && <Skeleton lines={4} />}
          {farmers.status === "error" && (
            <ErrorState title="Farmer list unavailable" message={farmers.message} onRetry={refetchFarmers} />
          )}
          {farmers.status === "success" && farmers.data.length === 0 && (
            <EmptyState
              title="No farmers yet"
              description="Register a farmer using the form to get started."
            />
          )}
          {farmers.status === "success" && farmers.data.length > 0 && (
            <ul className="space-y-3">
              {farmers.data.map((farmer) => {
                const isSelected = farmer.id === selectedFarmerId;
                return (
                  <li
                    key={farmer.id}
                    className={`flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors ${
                      isSelected ? "border-leaf-300 bg-leaf-50" : "border-soil-100 bg-white hover:border-soil-200"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-medium text-soil-800">
                        {farmer.name}
                        {isSelected && <Badge tone="leaf">Selected</Badge>}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-sm text-soil-600">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {farmer.village}, {farmer.district}, {farmer.state} · {farmer.phone} ·{" "}
                        {farmer.language}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-soil-500">
                        <Sprout className="h-3.5 w-3.5 shrink-0" />
                        {farmer.primaryCrop} · {farmer.soilType} soil ·{" "}
                        {farmer.latitude !== null && farmer.longitude !== null
                          ? `${farmer.latitude.toFixed(4)}, ${farmer.longitude.toFixed(4)}`
                          : "location not resolved"}
                      </p>
                      {farmer.hasActiveLoan && farmer.loanDueDate && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-wheat-700">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          Loan due in {daysUntil(farmer.loanDueDate)} day(s) ({farmer.loanDueDate})
                        </p>
                      )}
                    </div>
                    <Button
                      variant={isSelected ? "ghost" : "secondary"}
                      onClick={() => selectFarmer(farmer.id)}
                      disabled={isSelected}
                      className="shrink-0"
                    >
                      {isSelected ? "Selected" : "Select"}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function inputClass(hasError: boolean): string {
  return `w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
    hasError
      ? "border-danger-600 focus:border-danger-600 focus:ring-danger-600"
      : "border-soil-200 focus:border-leaf-500 focus:ring-leaf-500"
  }`;
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-soil-700">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-sm text-danger-600">{error}</p>}
    </div>
  );
}
