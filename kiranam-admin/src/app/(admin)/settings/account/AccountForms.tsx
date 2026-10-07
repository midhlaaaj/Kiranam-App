'use client';

import { useActionState, useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Camera, KeyRound, Loader2, LogOut, User as UserIcon } from 'lucide-react';
import {
  updateProfile,
  changePassword,
  signOutEverywhere,
  type ProfileState,
  type PasswordFormState,
} from './actions';
import { buttonPrimary, buttonSecondary, cardClass, inputClass } from '@/lib/ui';
import { cn } from '@/lib/utils';
import { ConfirmSubmitButton } from '@/components/ConfirmSubmitButton';

const fieldLabelClass = 'text-sm font-medium text-kiranam-ink';

const initialProfileState: ProfileState = {};
const initialPasswordState: PasswordFormState = {};

export function AccountForms({
  fullName,
  email,
  avatarUrl,
}: {
  fullName: string;
  email: string;
  avatarUrl: string | null;
}) {
  return (
    <div className="space-y-6">
      <ProfileCard fullName={fullName} email={email} avatarUrl={avatarUrl} />
      <PasswordCard />
      <SessionsCard />
    </div>
  );
}

function CardHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-kiranam-ink">{title}</h2>
      <p className="mt-1 text-sm text-kiranam-muted">{description}</p>
    </div>
  );
}

function ProfileCard({
  fullName,
  email,
  avatarUrl,
}: {
  fullName: string;
  email: string;
  avatarUrl: string | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);

  const [state, formAction, pending] = useActionState(async (prev: ProfileState, formData: FormData) => {
    const result = await updateProfile(prev, formData);
    if (result.message) {
      toast.success(result.message);
      setRemoveAvatar(false);
      setPreviewUrl((url) => {
        if (url) URL.revokeObjectURL(url);
        return null;
      });
    }
    return result;
  }, initialProfileState);

  const currentAvatar = previewUrl ?? (!removeAvatar ? avatarUrl : null);

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setRemoveAvatar(false);
  }

  function onRemoveAvatar() {
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setRemoveAvatar(true);
  }

  return (
    <form action={formAction} className={cn(cardClass, 'p-5')}>
      <CardHeader
        title="Your profile"
        description="Also used in the WhatsApp comm center — changes apply in both places."
      />

      <div className="mt-5 flex items-center gap-4">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-kiranam-surface-alt text-kiranam-muted">
          {currentAvatar ? (
            // Preview can be a local blob: URL, so next/image isn't viable here.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentAvatar} alt="" className="size-full object-cover" />
          ) : (
            <UserIcon className="size-7" aria-hidden />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={cn(buttonSecondary, 'px-3.5 py-2')}
          >
            <Camera className="size-4" aria-hidden />
            {currentAvatar ? 'Change photo' : 'Add photo'}
          </button>
          {currentAvatar && (
            <button
              type="button"
              onClick={onRemoveAvatar}
              className="min-h-10 cursor-pointer text-sm font-semibold text-kiranam-muted hover:text-kiranam-danger"
            >
              Remove
            </button>
          )}
          <p className="w-full text-xs text-kiranam-muted">PNG, JPG, WebP or GIF, up to 2 MB.</p>
          <input
            ref={fileInputRef}
            name="avatar"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={onPickFile}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
          />
          <input type="hidden" name="remove_avatar" value={removeAvatar ? '1' : '0'} />
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="full_name" className={fieldLabelClass}>
            Full name
          </label>
          <input id="full_name" name="full_name" autoComplete="name" defaultValue={state.values?.fullName ?? fullName} required className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className={fieldLabelClass}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={state.values?.email ?? email}
            required
            aria-describedby="email-hint"
            className={inputClass}
          />
          <p id="email-hint" className="text-xs text-kiranam-muted">
            Changing it sends a confirmation link to both addresses.
          </p>
        </div>
      </div>

      {state?.error && (
        <p className="mt-4 text-sm text-kiranam-danger" role="alert">
          {state.error}
        </p>
      )}

      <div className="mt-5 flex justify-end">
        <button type="submit" disabled={pending} className={buttonPrimary}>
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {pending ? 'Saving…' : 'Save profile'}
        </button>
      </div>
    </form>
  );
}

/** Collapsed to a single row by default — changing a password is rare, so
 * three empty password fields shouldn't sit open on every visit. */
function PasswordCard() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: PasswordFormState, formData: FormData) => {
    const result = await changePassword(prev, formData);
    if (result.message) {
      toast.success(result.message);
      setOpen(false);
    }
    return result;
  }, initialPasswordState);
  const currentRef = useRef<HTMLInputElement>(null);
  const hintId = useId();

  useEffect(() => {
    if (open) currentRef.current?.focus();
  }, [open]);

  if (!open) {
    return (
      <div className={cn(cardClass, 'flex flex-wrap items-center justify-between gap-4 p-5')}>
        <CardHeader title="Password" description="Used to sign in to the admin panel and comm center." />
        <button type="button" onClick={() => setOpen(true)} className={buttonSecondary}>
          <KeyRound className="size-4" aria-hidden />
          Change password
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className={cn(cardClass, 'p-5')}>
      <CardHeader title="Change password" description="You’ll stay signed in on this device." />

      <div className="mt-5 grid gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="current_password" className={fieldLabelClass}>
            Current password
          </label>
          <input
            ref={currentRef}
            id="current_password"
            name="current_password"
            type="password"
            autoComplete="current-password"
            required
            className={inputClass}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="new_password" className={fieldLabelClass}>
              New password
            </label>
            <input
              id="new_password"
              name="new_password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              aria-describedby={hintId}
              className={inputClass}
            />
            <p id={hintId} className="text-xs text-kiranam-muted">
              At least 8 characters.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirm_password" className={fieldLabelClass}>
              Confirm new password
            </label>
            <input
              id="confirm_password"
              name="confirm_password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {state?.error && (
        <p className="mt-4 text-sm text-kiranam-danger" role="alert">
          {state.error}
        </p>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} disabled={pending} className={buttonSecondary}>
          Cancel
        </button>
        <button type="submit" disabled={pending} className={buttonPrimary}>
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {pending ? 'Updating…' : 'Update password'}
        </button>
      </div>
    </form>
  );
}

function SessionsCard() {
  const router = useRouter();

  return (
    <div className={cn(cardClass, 'flex flex-wrap items-center justify-between gap-4 p-5')}>
      <CardHeader title="Sessions" description="Sign out on every device, including this one." />
      <ConfirmSubmitButton
        action={signOutEverywhere}
        label={
          <>
            <LogOut className="size-4" aria-hidden />
            Sign out everywhere
          </>
        }
        title="Sign out everywhere?"
        description="Every device signed in to this account will be signed out, including this one. You’ll need to sign in again."
        confirmLabel="Sign out everywhere"
        successMessage="Signed out everywhere."
        pendingMessage="Signing out…"
        destructive
        className={buttonSecondary}
        onSuccess={() => router.push('/login')}
      />
    </div>
  );
}
