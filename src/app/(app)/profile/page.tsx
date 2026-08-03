import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/dal";
import { getUserStats } from "@/lib/stats";
import { logout } from "@/app/actions/auth";
import { uploadPhoto, removePhoto } from "@/app/actions/photo";
import { photoUrl } from "@/lib/photos";
import { getLatestMetric } from "@/lib/body";
import { formatVolume, formatWeight } from "@/lib/units";
import {
  LargeTitle,
  SectionHeader,
  InsetGroup,
  InfoRow,
  LinkRow,
} from "@/components/ui";
import ProfileForm from "@/components/ProfileForm";
import PhotoPicker from "@/components/PhotoPicker";
import SubmitButton from "@/components/SubmitButton";

export const metadata: Metadata = { title: "Profile" };

// Photo actions report back through a redirect param rather than returned
// state, so the upload form can stay server-rendered. See actions/photo.ts.
const PHOTO_MESSAGES: Record<string, { text: string; ok: boolean }> = {
  saved: { text: "Photo updated.", ok: true },
  removed: { text: "Photo removed.", ok: true },
  empty: { text: "Choose a photo before saving.", ok: false },
  large: { text: "That image is too large. Try one under 6 MB.", ok: false },
  type: { text: "That file isn't a JPEG, PNG or WebP image.", ok: false },
};

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ photo?: string }>;
}) {
  const user = await getCurrentUser();
  const stats = await getUserStats(user.id);
  const latestWeight = await getLatestMetric(user.id, "WEIGHT");
  const { photo } = await searchParams;

  const message = photo ? PHOTO_MESSAGES[photo] : undefined;
  const currentPhoto = photoUrl(user.id, user.photo);

  return (
    <div>
      <LargeTitle title="Profile" />

      <SectionHeader>Photo</SectionHeader>
      <InsetGroup>
        <form action={uploadPhoto}>
          <PhotoPicker name={user.name} currentSrc={currentPhoto} />
          <div className="border-t border-separator px-4 py-3">
            <SubmitButton pendingLabel="Saving…">Save Photo</SubmitButton>
          </div>
        </form>

        {currentPhoto && (
          <form action={removePhoto}>
            <button
              type="submit"
              className="ios-press w-full border-t border-separator py-[11px] text-[17px] font-medium text-danger"
            >
              Remove Photo
            </button>
          </form>
        )}
      </InsetGroup>

      {message && (
        <p
          className={`px-5 pt-2 text-[13px] ${
            message.ok ? "text-success" : "text-danger"
          }`}
        >
          {message.text}
        </p>
      )}

      <SectionHeader>Body</SectionHeader>
      <InsetGroup>
        <LinkRow
          href="/body"
          title="Measurements"
          subtitle="Weight, height and body fat"
          trailing={
            latestWeight
              ? formatWeight(latestWeight.value, user.unit)
              : undefined
          }
          last
        />
      </InsetGroup>

      <SectionHeader>Settings</SectionHeader>
      <ProfileForm name={user.name} unit={user.unit} />

      <SectionHeader>Account</SectionHeader>
      <InsetGroup>
        <InfoRow label="Email" value={user.email} />
        <InfoRow
          label="Member since"
          value={new Intl.DateTimeFormat("en-US", {
            month: "short",
            year: "numeric",
          }).format(user.createdAt)}
        />
        <InfoRow label="Workouts" value={String(stats.workoutCount)} />
        <InfoRow
          label="Total moved"
          value={formatVolume(stats.lifetimeVolumeKg, user.unit)}
          last
        />
      </InsetGroup>

      <div className="px-4 pt-6">
        <form action={logout}>
          <button
            type="submit"
            className="ios-press flex h-[50px] w-full items-center justify-center rounded-[12px] bg-surface text-[17px] font-medium text-danger"
          >
            Sign Out
          </button>
        </form>
      </div>
    </div>
  );
}
