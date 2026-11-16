"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Textarea } from "@/components/ui/input";
import { apiRequest, errorMessage } from "@/lib/api";
import type { ContactResponse } from "@/lib/types";
import { contactSchema, type ContactValues } from "@/lib/validation";

export function ContactForm({ defaultSubject = "" }: { defaultSubject?: string }) {
  const [sent, setSent] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const websiteRef = React.useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", subject: defaultSubject, message: "" },
  });

  async function onSubmit(values: ContactValues) {
    setServerError(null);
    try {
      await apiRequest<ContactResponse>("/contact", {
        method: "POST",
        body: { ...values, website: websiteRef.current?.value ?? "" },
      });
      setSent(true);
      reset({ name: "", email: "", subject: "", message: "" });
      toast.success("Message sent");
    } catch (error) {
      const message = errorMessage(error);
      setServerError(message);
      toast.error(message);
    }
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-7 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-6" />
        </span>
        <h2 className="mt-4 text-lg font-semibold">Message received</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Thanks for reaching out. The team will reply to the email address you provided.
        </p>
        <Button variant="outline" className="mt-5" onClick={() => setSent(false)}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {serverError ? <Alert variant="destructive">{serverError}</Alert> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="contact-name">Name</Label>
          <Input id="contact-name" autoComplete="name" placeholder="Your name" {...register("name")} />
          <FieldError>{errors.name?.message}</FieldError>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contact-email">Email</Label>
          <Input
            id="contact-email"
            type="email"
            autoComplete="email"
            placeholder="you@organization.com"
            {...register("email")}
          />
          <FieldError>{errors.email?.message}</FieldError>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contact-subject">
          Subject <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="contact-subject"
          placeholder="Enterprise, API access, security…"
          {...register("subject")}
        />
        <FieldError>{errors.subject?.message}</FieldError>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contact-message">Message</Label>
        <Textarea
          id="contact-message"
          rows={7}
          placeholder="Tell us about your workflow, volume and timeline."
          {...register("message")}
        />
        <FieldError>{errors.message?.message}</FieldError>
      </div>

      <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="contact-website">Website</label>
        <input
          ref={websiteRef}
          id="contact-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <Button type="submit" loading={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting ? "Sending…" : "Send message"}
        {!isSubmitting ? <Send className="size-4" /> : null}
      </Button>
    </form>
  );
}
