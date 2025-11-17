// src/_root/pages/DataDeletion.tsx
import { Link } from "react-router-dom";

const DataDeletion = () => {
  return (
    <div className="sm:w-420 flex-center flex-col p-6 home-container">
      <h1 className="h3-bold md:h2-bold">User Data Deletion</h1>
      <p className="text-light-3 small-medium md:base-regular mt-2">
        In compliance with GDPR and Meta policies, you can request the deletion of your data from LifeQs.
      </p>
      <div className="mt-4 text-light-1">
        <h2 className="h4-bold">Instructions</h2>
        <p>
          1. Log in to your account on{" "}
          <Link to="/sign-in" className="text-primary-500">
            LifeQs
          </Link>.
        </p>
        <p>
          2. Go to "Profile Settings" and select "Delete Account".
        </p>
        <p>
          3. For manual deletion, send an email to{" "}
          <a href="mailto:emna.othmen@gmail.com" className="text-primary-500">
            emna.othmen@gmail.com
          </a>{" "}
          with your registered email address.
        </p>
        <p>
          We will process your request within 30 days. All your data, including email, name, and other information stored in our Appwrite database, will be deleted.
        </p>
      </div>
    </div>
  );
};

export default DataDeletion;