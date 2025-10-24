import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfile, updateProfile, changePassword, logout, uploadAvatar } from '../services/api';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Camera, User, Mail, Calendar, FileText, MessageSquare, Lock, LogOut, Edit2, X, Check } from 'lucide-react';

const ProfilePage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(null);

  const [editData, setEditData] = useState({
    email: '',
    first_name: '',
    last_name: '',
  });

  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await getProfile();
      setProfile(response.data);
      setEditData({
        email: response.data.user.email || '',
        first_name: response.data.user.first_name || '',
        last_name: response.data.user.last_name || '',
      });
    } catch (err) {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await updateProfile(editData);
      setSuccess('Profile updated successfully!');
      setEditing(false);
      loadProfile();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('New passwords do not match');
      return;
    }

    if (passwordData.new_password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    try {
      const response = await changePassword({
        old_password: passwordData.old_password,
        new_password: passwordData.new_password,
      });
      
      // Update token
      localStorage.setItem('authToken', response.data.token);
      
      setSuccess('Password changed successfully!');
      setChangingPassword(false);
      setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      // Continue with logout even if API call fails
    } finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      navigate('/');
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setError('Only JPEG, PNG, and WebP images are allowed');
        return;
      }

      // Show preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);

      // Upload to backend
      try {
        setError('');
        const response = await uploadAvatar(file);
        setSuccess('Avatar updated successfully!');
        
        // Update local profile data with the user object from response
        setProfile(prev => ({
          ...prev,
          user: response.data.user
        }));

        // Update localStorage user data with the avatar path from database
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        storedUser.avatar = response.data.user.avatar;
        localStorage.setItem('user', JSON.stringify(storedUser));
        
        // Dispatch custom event to update Navbar
        window.dispatchEvent(new Event('avatarUpdated'));
        
        // Clear preview after successful upload
        setTimeout(() => {
          setAvatarPreview(null);
        }, 1000);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to upload avatar');
        setAvatarPreview(null);
      }
    }
  };

  const getInitials = () => {
    if (profile?.user.first_name && profile?.user.last_name) {
      return `${profile.user.first_name[0]}${profile.user.last_name[0]}`.toUpperCase();
    }
    return profile?.user.username?.charAt(0).toUpperCase() || 'U';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-slate-800 dark:to-gray-900">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-slate-800 dark:to-gray-900 transition-all duration-500">
      <Navbar />
      
      {/* Animated Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-br from-pink-400/20 to-blue-400/20 rounded-full blur-3xl animate-float" style={{animationDelay: '3s'}}></div>
      </div>

      <div className="relative max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden border border-gray-200/50 dark:border-gray-700/50">
          
          {/* Profile Header */}
          <div className="relative bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-600 dark:from-indigo-600 dark:via-purple-700 dark:to-pink-700 px-8 py-12">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
              {/* Avatar */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 to-indigo-500 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
                <div className="relative w-32 h-32 bg-gradient-to-br from-white to-gray-100 rounded-full flex items-center justify-center shadow-2xl cursor-pointer overflow-hidden"
                     onClick={handleAvatarClick}>
                  {avatarPreview ? (
                    <img 
                      src={avatarPreview} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : profile?.user.avatar ? (
                    <img 
                      src={`http://localhost:8000/media/${profile.user.avatar}`} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-5xl font-bold bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                      {getInitials()}
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>

              {/* User Info */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-4xl font-bold text-white mb-2">
                  {profile?.user.first_name && profile?.user.last_name
                    ? `${profile.user.first_name} ${profile.user.last_name}`
                    : profile?.user.username}
                </h1>
                <p className="text-indigo-100 dark:text-indigo-200 text-lg mb-1">@{profile?.user.username}</p>
                <p className="text-white/90 flex items-center justify-center md:justify-start gap-2">
                  <Mail className="w-4 h-4" />
                  {profile?.user.email}
                </p>
              </div>

              {/* Quick Stats */}
              <div className="flex gap-6 text-white">
                <div className="text-center">
                  <div className="text-3xl font-bold">{profile?.statistics.total_documents}</div>
                  <div className="text-sm text-indigo-100">Documents</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{profile?.statistics.total_chat_sessions}</div>
                  <div className="text-sm text-indigo-100">Chats</div>
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="mx-8 mt-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl">
              {error}
            </div>
          )}
          {success && (
            <div className="mx-8 mt-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-xl">
              {success}
            </div>
          )}

          {/* Detailed Statistics */}
          <div className="p-8 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              Statistics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="group relative overflow-hidden">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
                <div className="relative bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-xl border border-blue-200/50 dark:border-blue-800/50">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Documents</p>
                  <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">{profile?.statistics.total_documents}</p>
                </div>
              </div>
              
              <div className="group relative overflow-hidden">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
                <div className="relative bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-6 rounded-xl border border-purple-200/50 dark:border-purple-800/50">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                    <MessageSquare className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Chat Sessions</p>
                  <p className="text-4xl font-bold text-purple-600 dark:text-purple-400">{profile?.statistics.total_chat_sessions}</p>
                </div>
              </div>
              
              <div className="group relative overflow-hidden">
                <div className="absolute -inset-1 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
                <div className="relative bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-xl border border-green-200/50 dark:border-green-800/50">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Pages</p>
                  <p className="text-4xl font-bold text-green-600 dark:text-green-400">{profile?.statistics.total_pages}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Information */}
          <div className="p-8 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <User className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                Profile Information
              </h2>
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Profile
                </button>
              )}
            </div>

            {editing ? (
              <form onSubmit={handleUpdateProfile} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={editData.email}
                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-gray-900 dark:text-white transition-all"
                    placeholder="your.email@example.com"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">First Name</label>
                    <input
                      type="text"
                      value={editData.first_name}
                      onChange={(e) => setEditData({ ...editData, first_name: e.target.value })}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-gray-900 dark:text-white transition-all"
                      placeholder="First name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Last Name</label>
                    <input
                      type="text"
                      value={editData.last_name}
                      onChange={(e) => setEditData({ ...editData, last_name: e.target.value })}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-gray-900 dark:text-white transition-all"
                      placeholder="Last name"
                    />
                  </div>
                </div>
                <div className="flex gap-4 pt-2">
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <Check className="w-4 h-4" />
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50 p-5 rounded-xl border border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Username
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{profile?.user.username}</p>
                </div>
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50 p-5 rounded-xl border border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{profile?.user.email || 'Not provided'}</p>
                </div>
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50 p-5 rounded-xl border border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    First Name
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{profile?.user.first_name || 'Not set'}</p>
                </div>
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50 p-5 rounded-xl border border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Last Name
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{profile?.user.last_name || 'Not set'}</p>
                </div>
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50 p-5 rounded-xl border border-gray-200 dark:border-gray-700 md:col-span-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Member Since
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {new Date(profile?.user.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Change Password */}
          <div className="p-8 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Lock className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                Security
              </h2>
              {!changingPassword && (
                <button
                  onClick={() => setChangingPassword(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-medium rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <Lock className="w-4 h-4" />
                  Change Password
                </button>
              )}
            </div>

            {changingPassword ? (
              <form onSubmit={handleChangePassword} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current Password</label>
                  <input
                    type="password"
                    value={passwordData.old_password}
                    onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                    required
                    className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-gray-900 dark:text-white transition-all"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Password</label>
                  <input
                    type="password"
                    value={passwordData.new_password}
                    onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                    required
                    className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-gray-900 dark:text-white transition-all"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordData.confirm_password}
                    onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                    required
                    className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-gray-900 dark:text-white transition-all"
                    placeholder="••••••••"
                  />
                </div>
                <div className="flex gap-4 pt-2">
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-medium rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <Check className="w-4 h-4" />
                    Update Password
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChangingPassword(false);
                      setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-gray-600 dark:text-gray-400">
                Keep your account secure by using a strong password and updating it regularly.
              </p>
            )}
          </div>

          {/* Logout */}
          <div className="p-8">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ProfilePage;
