import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE_URL, fetchProfile, updateProfile, uploadAvatar, type User } from "../api";
import { useAuth } from "../auth";

const emptyForm = {
  name: "",
  age: "",
  gender: "",
  address: "",
  bio: "",
};

function ProfileEditPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const resolveAvatarUrl = (value?: string | null) => {
    if (!value) {
      return null;
    }
    if (value.startsWith("http://") || value.startsWith("https://")) {
      return value;
    }
    return `${API_BASE_URL}${value}`;
  };

  useEffect(() => {
    if (!user) {
      return;
    }
    setForm(fromUser(user));
    setAvatarPreview(resolveAvatarUrl(user.avatar_url));
    setLoading(true);
    fetchProfile(user.id)
      .then((profile) => {
        setUser(profile);
        setForm(fromUser(profile));
        setAvatarPreview(resolveAvatarUrl(profile.avatar_url));
      })
      .catch((err) => {
        console.error(err);
        setError("Unable to load profile");
      })
      .finally(() => setLoading(false));
  }, [user?.id, setUser]);

  function fromUser(profile: User | null) {
    if (!profile) {
      return emptyForm;
    }
    return {
      name: profile.name ?? "",
      age: profile.age != null ? String(profile.age) : "",
      gender: profile.gender ?? "",
      address: profile.address ?? "",
      bio: profile.bio ?? "",
    };
  }

  function updateField(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      return;
    }
    setSavingProfile(true);
    setError(null);
    try {
      const payload = {
        name: form.name || undefined,
        age: form.age ? Number(form.age) : undefined,
        gender: form.gender || undefined,
        address: form.address || undefined,
        bio: form.bio || undefined,
      };
      const updated = await updateProfile(user.id, payload);
      setUser(updated);
      setForm(fromUser(updated));
      setAvatarPreview(resolveAvatarUrl(updated.avatar_url));
      navigate("/profile", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    if (!user) {
      return;
    }
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const localPreview = URL.createObjectURL(file);
    setAvatarPreview(localPreview);
    setUploadingAvatar(true);
    setError(null);
    try {
      const updated = await uploadAvatar(user.id, file);
      setUser(updated);
      setAvatarPreview(resolveAvatarUrl(updated.avatar_url) ?? localPreview);
      navigate("/profile", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload avatar");
    } finally {
      setUploadingAvatar(false);
      event.target.value = "";
    }
  }

  if (!user) {
    return null;
  }

  return (
    <div className="page-wrapper">
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-lg-7">
            <section className="section-card">
              <div className="section-title">
                <div>
                  <h3>Edit profile</h3>
                  <p className="text-muted mb-0">Update your personal information and avatar.</p>
                </div>
                {loading && <span className="stat-pill">Loading...</span>}
              </div>

              <div className="file-upload d-flex flex-column align-items-start gap-3">
                <div>
                  <span className="d-block mb-2">Current avatar</span>
                  {avatarPreview || user.avatar_url ? (
                    <img
                      src={avatarPreview ?? resolveAvatarUrl(user.avatar_url) ?? ""}
                      alt="Avatar preview"
                      className="avatar"
                      style={{ width: "96px", height: "96px" }}
                    />
                  ) : (
                    <div className="text-muted small">No avatar uploaded yet.</div>
                  )}
                </div>
                <label className="w-100">
                  <span>Update avatar</span>
                  <input type="file" accept="image/*" onChange={handleAvatarChange} disabled={uploadingAvatar} />
                </label>
              </div>

              <form onSubmit={handleProfileSubmit} className="form">
                <label>
                  <span>Name</span>
                  <input
                    name="name"
                    type="text"
                    className="form-control"
                    value={form.name}
                    onChange={updateField}
                    placeholder="Your full name"
                  />
                </label>

                <label>
                  <span>Age</span>
                  <input
                    name="age"
                    type="number"
                    className="form-control"
                    value={form.age}
                    onChange={updateField}
                    min={0}
                    max={120}
                    placeholder="30"
                  />
                </label>

                <div>
                  <span>Gender</span>
                  <div className="d-flex flex-wrap gap-4 mt-2">
                    {["Female", "Male", "Other"].map((option) => (
                      <label className="form-check d-flex align-items-center gap-2" key={option}>
                        <input
                          className="form-check-input"
                          type="radio"
                          name="gender"
                          value={option}
                          checked={form.gender === option}
                          onChange={() => setForm((prev) => ({ ...prev, gender: option }))}
                        />
                        <span className="form-check-label">{option}</span>
                      </label>
                    ))}
                    <label className="form-check d-flex align-items-center gap-2">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="gender"
                        value=""
                        checked={!form.gender}
                        onChange={() => setForm((prev) => ({ ...prev, gender: "" }))}
                      />
                      <span className="form-check-label">Prefer not to say</span>
                    </label>
                  </div>
                </div>

                <label>
                  <span>Address</span>
                  <input
                    name="address"
                    type="text"
                    className="form-control"
                    value={form.address}
                    onChange={updateField}
                    placeholder="123 Demo Street"
                  />
                </label>

                <label>
                  <span>Bio</span>
                  <textarea
                    name="bio"
                    className="form-control"
                    value={form.bio}
                    onChange={updateField}
                    placeholder="Tell us something about you"
                    rows={3}
                  />
                </label>

                {error && <p className="error">{error}</p>}
                <button type="submit" disabled={savingProfile}>
                  {savingProfile ? "Saving..." : "Save profile"}
                </button>
              </form>

              <hr />
              <Link to="/profile" className="button-link secondary">
                Back to profile
              </Link>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileEditPage;
