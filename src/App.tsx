import { Routes, Route } from "react-router-dom";
import {
  Home,
  Saved,
  CreatePost,
  Profile,
  EditPost,
  PostDetails,
  AllUsers,
  CreateGroups,
  ViewGroups,
  GroupPage,
  MyGroups,
  ViewPolls,
  CreatePollPage,
  PollDetails,
  Questions,
  UpdateProfile,
} from "@/_root/pages";
import AuthLayout from "./_auth/AuthLayout";
import RootLayout from "./_root/RootLayout";
import { SearchProvider } from "@/context/SearchContext";
import { ThemeProvider } from "@/context/ThemeContext";
import SignupForm from "@/_auth/forms/SignupForm";
import SigninForm from "@/_auth/forms/SigninForm";
import ForgotPasswordForm from "@/_auth/forms/ForgotPasswordForm";
import ResetPasswordForm from "@/_auth/forms/ResetPasswordForm";
import VerifyEmail from "@/_auth/VerifyEmail";
import { Toaster } from "@/components/ui/toaster";
import { AuthModalProvider } from "@/context/AuthModalContext";
import AuthModal from "./_auth/AuthModal";
import "./globals.css";
import ChatPage from "./_root/pages/ChatPage";
import MessagesPage from "./_root/pages/MessagesPage";
import Level from "./_root/pages/Level";
import PrivacyPolicy from "./_root/pages/PrivacyPolicy";
import DataDeletion from "./_root/pages/DataDeletion";
import TermsOfService from "./_root/pages/TermsOfService";
import BusinessApplicationForm from "@/_auth/forms/BusinessApplicationForm";
import CompleteProfile from "@/_auth/forms/CompleteProfile";
import ProtectedRoute from "./_auth/ProtectedRoute";
import ChangePassword from "./_root/pages/settings/ChangePassword";
import ChangeEmail from "./_root/pages/settings/ChangeEmail";
import Notifications from "./_root/pages/settings/Notifications";
import DeleteYourAccount from "./_root/pages/settings/DeleteYourAccount";
import CommentDisplay from "./_root/pages/settings/CommentDisplay";
import Settings from "./_root/pages/settings/Settings";
import MyDrafts from "./_root/pages/MyDrafts";
import EmailNotifications from "./_root/pages/settings/EmailNotifications";
import About from "./_root/pages/About";
import FAQ from "./_root/pages/FAQ";
import PointsLevels from "./_root/pages/PointsLevels";
import Advertise from "./_root/pages/Advertise";

const App = () => {
  return (
    <ThemeProvider>
      <AuthModalProvider>
        <SearchProvider>
          <main className="flex h-screen">
          <Routes>
            {/* Public Auth Routes */}
            <Route element={<AuthLayout />}>
              <Route path="/sign-in" element={<SigninForm />} />
              <Route path="/sign-up" element={<SignupForm />} />
              <Route path="/forgot-password" element={<ForgotPasswordForm />} />
              <Route path="/reset-password" element={<ResetPasswordForm />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route
                path="/apply-business"
                element={<BusinessApplicationForm />}
              />
            </Route>

            {/* Public Content Routes */}
            <Route element={<RootLayout />}>
              <Route index element={<Home />} />
              <Route path="/questions" element={<Questions />} />
              <Route path="/posts/:id" element={<PostDetails />} />
              <Route path="/polls" element={<ViewPolls />} />
              <Route path="/polls/:id" element={<PollDetails />} />
              <Route
                path="/groups/:groupId/posts/:id"
                element={<PostDetails />}
              />
              <Route
                path="/groups/:groupId/polls/:id"
                element={<PollDetails />}
              />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/data-deletion" element={<DataDeletion />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/about" element={<About />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/points-levels" element={<PointsLevels />} />
              <Route path="/advertise" element={<Advertise />} />
            </Route>

            {/* Private Routes */}
            <Route element={<RootLayout />}>
              <Route path="/complete-profile" element={<CompleteProfile />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/settings" element={<Settings />}>
                  <Route path="update-profile" element={<UpdateProfile />} />
                  <Route path="change-password" element={<ChangePassword />} />
                  <Route path="change-email" element={<ChangeEmail />} />
                  <Route path="comment-display" element={<CommentDisplay />} />
                  <Route path="delete-account" element={<DeleteYourAccount />} />
                  <Route path="notifications" element={<Notifications />} />
                  <Route
                    path="email-notifications"
                    element={<EmailNotifications />}
                  />
                </Route>

                <Route path="/saved" element={<Saved />} />
                <Route path="/all-users" element={<AllUsers />} />
                <Route path="/create-post" element={<CreatePost />} />
                <Route path="/update-post/:id" element={<EditPost />} />
                <Route path="/Level" element={<Level />} />
                <Route path="/profile/:id/*" element={<Profile />} />
                <Route path="/groups/create" element={<CreateGroups />} />
                <Route path="/groups" element={<ViewGroups />} />
                <Route path="/groups/:groupId" element={<GroupPage />} />
                <Route path="/my-groups" element={<MyGroups />} />
                <Route
                  path="/groups/:groupId/create-post-group"
                  element={<CreatePost />}
                />
                <Route
                  path="/groups/:groupId/create-poll"
                  element={<CreatePollPage action="Create" />}
                />
                <Route
                  path="/polls/create"
                  element={<CreatePollPage action="Create" />}
                />
                <Route
                  path="/update-poll/:id"
                  element={<CreatePollPage action="Update" />}
                />
                <Route path="/chat/:userId" element={<ChatPage />} />
                <Route path="/MessagesPage" element={<MessagesPage />} />
                <Route path="/my-drafts" element={<MyDrafts />} />
              </Route>
            </Route>
          </Routes>
          <Toaster />
          <AuthModal />
          </main>
        </SearchProvider>
      </AuthModalProvider>
    </ThemeProvider>
  );
};

export default App;