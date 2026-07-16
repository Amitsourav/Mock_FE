"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { CardHeader } from "@/components/Card";
import { ReadOnlyField, SelectField, TextField } from "@/components/TextField";
import { ApiError, getExams, updateProfile } from "@/lib/api";
import { formatE164ForDisplay } from "@/lib/phone";
import type { Exam, User } from "@/lib/types";

const TARGET_COUNTRIES = [
  "Germany",
  "Austria",
  "Switzerland",
  "Netherlands",
  "France",
  "Ireland",
  "United Kingdom",
  "United States",
  "Canada",
  "Australia",
  "Other",
];

type Fields = {
  full_name: string;
  email: string;
  address: string;
  target_country: string;
  target_examination_id: string;
};

type FieldErrors = Partial<Record<keyof Fields, string>>;

function validate(fields: Fields): FieldErrors {
  const errors: FieldErrors = {};
  if (!fields.full_name.trim()) errors.full_name = "Enter your full name.";
  if (!fields.target_country) errors.target_country = "Select the country you're applying to.";
  // Email is optional, but if given it should look like one.
  if (fields.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) {
    errors.email = "Enter a valid email address, or leave it blank.";
  }
  return errors;
}

export function ProfileStep({
  user,
  onCompleted,
  onUnauthorized,
}: {
  user: User;
  onCompleted: (updated: User) => void;
  onUnauthorized: () => void;
}) {
  // Seed from the server record: a partially-filled profile shouldn't come back empty.
  const [fields, setFields] = useState<Fields>({
    full_name: user.full_name ?? "",
    email: user.email ?? "",
    address: user.address ?? "",
    target_country: user.target_country ?? "",
    target_examination_id: user.target_examination_id ?? "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof Fields, boolean>>>({});
  const [exams, setExams] = useState<Exam[]>([]);
  const [examsFailed, setExamsFailed] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    getExams()
      .then((list) => {
        if (active) setExams(list);
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof ApiError && error.unauthorized) {
          onUnauthorized();
          return;
        }
        // The exam field is optional — a failed list shouldn't block registration.
        setExamsFailed(true);
      });
    return () => {
      active = false;
    };
  }, [onUnauthorized]);

  const set = (key: keyof Fields) => (value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setSubmitError(null);
  };

  const blur = (key: keyof Fields) => () => {
    setTouched((prev) => ({ ...prev, [key]: true }));
    setErrors(validate({ ...fields }));
  };

  const errorFor = (key: keyof Fields) => (touched[key] ? errors[key] : undefined);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const found = validate(fields);
    setErrors(found);
    setTouched({ full_name: true, email: true, address: true, target_country: true });
    if (Object.keys(found).length > 0) {
      // Send focus to the first problem so keyboard users aren't hunting for it.
      const firstKey = (Object.keys(found) as (keyof Fields)[])[0];
      document.querySelector<HTMLElement>(`[data-field="${firstKey}"]`)?.focus();
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const updated = await updateProfile({
        full_name: fields.full_name.trim(),
        target_country: fields.target_country,
        email: fields.email.trim() || null,
        address: fields.address.trim() || null,
        target_examination_id: fields.target_examination_id || null,
      });
      onCompleted(updated);
    } catch (error) {
      // Never wipe the form — the user's typing survives every failure path.
      if (error instanceof ApiError && error.unauthorized) {
        onUnauthorized();
        return;
      }
      setSubmitError(
        error instanceof ApiError ? error.message : "Something went wrong. Please try again."
      );
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="animate-step-in">
      <CardHeader
        title="Complete your registration"
        subtitle="A few details so we can match you to the right mock exam."
      />

      <div className="flex flex-col gap-5">
        <ReadOnlyField label="Mobile number" value={formatE164ForDisplay(user.phone)} />

        <TextField
          label="Full name"
          data-field="full_name"
          value={fields.full_name}
          onChange={(event) => set("full_name")(event.target.value)}
          onBlur={blur("full_name")}
          error={errorFor("full_name")}
          disabled={submitting}
          type="text"
          autoComplete="name"
          required
          autoFocus
        />

        <TextField
          label="Email"
          data-field="email"
          optional
          value={fields.email}
          onChange={(event) => set("email")(event.target.value)}
          onBlur={blur("email")}
          error={errorFor("email")}
          disabled={submitting}
          type="email"
          inputMode="email"
          autoComplete="email"
        />

        <TextField
          label="Address"
          data-field="address"
          optional
          value={fields.address}
          onChange={(event) => set("address")(event.target.value)}
          onBlur={blur("address")}
          disabled={submitting}
          type="text"
          autoComplete="street-address"
        />

        <SelectField
          label="Target country"
          data-field="target_country"
          value={fields.target_country}
          onChange={(event) => set("target_country")(event.target.value)}
          onBlur={blur("target_country")}
          error={errorFor("target_country")}
          disabled={submitting}
          required
        >
          <option value="" disabled>
            Select a country
          </option>
          {TARGET_COUNTRIES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="Exam you're targeting"
          optional
          value={fields.target_examination_id}
          onChange={(event) => set("target_examination_id")(event.target.value)}
          disabled={submitting || examsFailed || exams.length === 0}
          hint={examsFailed ? "We couldn't load the exam list. You can still register." : undefined}
        >
          <option value="">{examsFailed ? "Unavailable" : "No preference"}</option>
          {exams.map((exam) => (
            <option key={exam.id} value={exam.id}>
              {exam.name} ({exam.code})
            </option>
          ))}
        </SelectField>
      </div>

      {submitError ? (
        <p role="alert" className="mt-5 flex items-start gap-1.5 text-[13px] text-error">
          <span aria-hidden="true" className="mt-px font-semibold leading-none">
            !
          </span>
          <span>{submitError}</span>
        </p>
      ) : null}

      <div className="mt-6">
        <Button type="submit" loading={submitting} loadingLabel="Submitting…">
          Complete registration
        </Button>
      </div>
    </form>
  );
}
