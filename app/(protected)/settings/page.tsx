/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useUser, SignOutButton, useClerk } from '@clerk/nextjs';
import { Widget } from '@uploadcare/react-widget';
import { UploadcareError, type FileInfo } from '@uploadcare/upload-client';
import { useRouter } from 'next/navigation';
import { updateUserProfile } from '@/app/actions/settings';
import Link from 'next/link';

const Spinner = () => (
  <div
    className="inline-block border-2 border-current border-r-transparent border-solid rounded-full w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-spin motion-reduce:animate-[spin_1.5s_linear_infinite] align-[-0.125em]"
    role="status"
  >
    <span className="!absolute !-m-px !p-0 !border-0 !w-px !h-px !overflow-hidden !whitespace-nowrap ![clip:rect(0,0,0,0)]">
      Loading...
    </span>
  </div>
);

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  description?: string;
}

const InputField: React.FC<InputProps> = ({ label, id, description, ...props }) => (
  <div>
    <label htmlFor={id} className="block mb-1 font-serif font-light text-gray-700 dark:text-gray-300 text-sm">
      {label}
    </label>
    <input
      id={id}
      {...props}
      className={`w-full px-4 py-3 border font-serif
                 bg-white dark:bg-black 
                 border-gray-200 dark:border-gray-800 
                 text-gray-900 dark:text-gray-100 
                 placeholder-gray-400 dark:placeholder-gray-600 
                 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:focus:ring-indigo-700
                 disabled:opacity-50 disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:cursor-not-allowed
                 rounded-lg backdrop-blur-sm transition-all duration-200
                 ${props.className || ''}`}
    />
    {description && <p className="mt-1 font-serif text-gray-500 dark:text-gray-500 text-xs italic">{description}</p>}
  </div>
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', isLoading = false, ...props }) => {
  const baseStyle = "inline-flex items-center justify-center px-5 py-2.5 border border-transparent rounded-lg font-serif text-sm focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200";
  let variantStyle = '';

  switch (variant) {
    case 'primary':
      variantStyle = "bg-indigo-700 text-white hover:bg-indigo-800 dark:bg-indigo-900 dark:hover:bg-indigo-800";
      break;
    case 'secondary':
      variantStyle = "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 dark:border dark:border-gray-800";
      break;
    case 'danger':
      variantStyle = "bg-red-700 text-white hover:bg-red-800 dark:bg-red-900 dark:hover:bg-red-800";
      break;
    case 'ghost':
      variantStyle = "bg-transparent text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-900 border border-gray-200 dark:border-gray-800";
      break;
  }

  return (
    <button
      {...props}
      disabled={props.disabled || isLoading}
      className={`${baseStyle} ${variantStyle} ${props.className || ''}`}
    >
      {isLoading ? <Spinner /> : children}
    </button>
  );
};

// --- Settings Page Component ---

export default function SettingsPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState('');
  const [newAvatarUrl, setNewAvatarUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Initialize form state
  useEffect(() => {
    if (user) {
      setName(user.fullName || user.firstName || user.primaryEmailAddress?.emailAddress?.split('@')[0] || '');
    }
  }, [user]);

  const handleProfileUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setUploadError(null);

    const dataToUpdate: { name?: string; avatarUrl?: string } = {};
    const currentName = user?.fullName || user?.firstName || '';
    const currentAvatar = user?.imageUrl;

    const trimmedName = name.trim();
    if (trimmedName && trimmedName !== currentName) {
      dataToUpdate.name = trimmedName;
    }
    if (newAvatarUrl && newAvatarUrl !== currentAvatar) {
      dataToUpdate.avatarUrl = newAvatarUrl;
    }

    if (Object.keys(dataToUpdate).length === 0) {
      setError("No changes to save.");
      return;
    }

    startTransition(async () => {
      const result = await updateUserProfile(dataToUpdate);
      if (result.success) {
        setSuccess('Profile updated successfully!');
        setNewAvatarUrl(null);
      } else {
        setError(result.error || 'An unknown error occurred while saving.');
      }
    });
  };

  const handleUploadComplete = (fileInfo: FileInfo) => {
    console.log('Upload complete:', fileInfo);
    setUploadError(null);
    if (fileInfo.cdnUrl) {
      setNewAvatarUrl(fileInfo.cdnUrl);
      setSuccess("Avatar ready to be saved.");
      setError(null);
    } else {
      setUploadError("Failed to get image URL after upload.");
    }
  };

  const handleUploadError = (error: UploadcareError | Error) => {
    console.error("Upload error:", error);
    const message = error instanceof UploadcareError ? error.message : "Image upload failed.";
    setUploadError(`Upload Error: ${message}`);
    setError(null);
    setSuccess(null);
  };

  const handleSignOut = async () => {
    await signOut(() => {
      router.push('/');
    });
  };

  // --- Render Logic ---

  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center bg-gray-50 dark:bg-black min-h-screen font-serif">
        <Spinner /> <span className="ml-2 text-gray-600 dark:text-gray-400">Loading settings...</span>
      </div>
    );
  }

  if (!isSignedIn) {
    router.push('/auth/signin');
    return null;
  }

  const uploadcarePublicKey = process.env.NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY;
  if (!uploadcarePublicKey) {
    return <div className="p-4 font-serif text-red-600 dark:text-red-400">Configuration error: Uploadcare Public Key is missing.</div>;
  }

  return (
    <div className="bg-gradient-to-b from-gray-50 dark:from-black to-white dark:to-gray-900 py-12 min-h-screen font-serif">
      <div className="mx-auto px-6 max-w-2xl">
        <h1 className="mb-10 font-light text-gray-800 dark:text-gray-100 text-4xl tracking-tight">
          Settings
        </h1>

        {/* --- Profile Information Section --- */}
        <div className="bg-white dark:bg-black shadow-sm backdrop-blur-sm mb-8 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
          <div className="p-8">
            <h2 className="mb-8 pb-2 border-gray-100 dark:border-gray-800 border-b font-light text-gray-800 dark:text-gray-200 text-2xl">
              Profile Information
            </h2>
            <form onSubmit={handleProfileUpdate} className="space-y-6">
              {/* Email */}
              <InputField
                label="Email"
                id="email"
                type="email"
                value={user.primaryEmailAddress?.emailAddress || 'N/A'}
                disabled
                description="Email cannot be changed here."
              />

              {/* Name */}
              <InputField
                label="Name"
                id="name"
                type="text"
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                placeholder="Your display name"
                disabled={isPending}
              />

              {/* Avatar Upload */}
              <div>
                <label className="block mb-3 font-light text-gray-700 dark:text-gray-300 text-sm">
                  Profile Picture
                </label>
                <div className='flex items-center gap-6'>
                  <div className="relative">
                    <img
                      src={newAvatarUrl || user.imageUrl || '/default-avatar.png'}
                      alt="Avatar Preview"
                      className="shadow-sm border border-gray-200 dark:border-gray-800 rounded-full w-20 h-20 object-cover transition-all duration-300"
                      onError={(e) => {
                        if (e.currentTarget.src !== '/default-avatar.png') {
                          e.currentTarget.src = '/default-avatar.png';
                        }
                      }}
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 rounded-full transition-all duration-300"></div>
                  </div>
                  <div className='flex-grow space-y-2'>
                    <div className="[&>div>button:hover]:!bg-gray-50 [&>div>button:hover]:dark:!bg-gray-900 [&>div>button]:!bg-white [&>div>button]:dark:!bg-black [&>div>button]:!border [&>div>button]:!border-gray-200 [&>div>button]:dark:!border-gray-800 [&>div>button]:!rounded-lg [&>div>button]:!font-serif [&>div>button]:!text-gray-700 [&>div>button]:dark:!text-gray-300 [&>div>button]:!transition-all [&>div>button]:!duration-200">
                      <label htmlFor='file-upload' className='sr-only'>Upload profile picture</label>
                      <Widget
                        publicKey={uploadcarePublicKey}
                        id="file-upload"
                        onChange={handleUploadComplete}
                        onError={handleUploadError}
                        inputAcceptTypes="image/*"
                        clearable
                        validators={[
                          (fileInfo => {
                            if (fileInfo.size !== null && fileInfo.size > 5 * 1024 * 1024) {
                              throw new Error("File size shouldn't exceed 5 MB");
                            }
                          })
                        ]}
                      />
                    </div>
                    {uploadError && <p className="text-red-600 dark:text-red-400 text-xs">{uploadError}</p>}
                    <p className="text-gray-400 dark:text-gray-500 text-xs italic">Max 5MB. Recommended: Square image.</p>
                  </div>
                </div>
              </div>

              {/* Save Button & Messages */}
              <div className="flex justify-between items-center pt-4">
                <div>
                  {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}
                  {success && <p className="text-green-600 dark:text-green-400 text-sm">{success}</p>}
                </div>
                <Button type="submit" variant="primary" isLoading={isPending}>
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* --- Account Management Section --- */}
        <div className="bg-white dark:bg-black shadow-sm backdrop-blur-sm border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
          <div className="p-8">
            <h2 className="mb-8 pb-2 border-gray-100 dark:border-gray-800 border-b font-light text-gray-800 dark:text-gray-200 text-2xl">
              Account Management
            </h2>
            <div className="space-y-6">
              {/* Sign Out Button */}
              <div>
                <Button onClick={handleSignOut} variant="ghost" className="w-full">
                  Sign Out
                </Button>
                <p className="mt-2 text-gray-400 dark:text-gray-500 text-xs italic">You will be logged out of your current session.</p>
              </div>

              {/* Manage/Delete Account Link */}
              <div>
                <Link
                  href="/user"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block w-full"
                >
                  <Button variant="danger" className="w-full">
                    Manage Account (Clerk)
                  </Button>
                </Link>
                <p className="mt-2 text-gray-400 dark:text-gray-500 text-xs italic">Opens Clerk's profile management page where you can change password, manage connections, or delete your account.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}