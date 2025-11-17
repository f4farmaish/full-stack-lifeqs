import * as z from "zod";
import {
  relationshipStatusOptions,
  occupationOptions,
  educationLevelOptions,
} from "@/constants/demographicOptions";
import { checkGroupNameExists } from "@/services/groupService";

// ============================================================
// USER
// ============================================================
export const SignupValidation = z.object({
  firstName: z
    .string()
    .min(2, { message: "First name must be at least 2 characters." })
    .max(50, { message: "First name cannot exceed 50 characters." }),
  lastName: z
    .string()
    .min(2, { message: "Last name must be at least 2 characters." })
    .max(50, { message: "Last name cannot exceed 50 characters." }),
  name: z
    .string()
    .min(3, { message: "Nickname must be at least 3 characters." })
    .max(20, { message: "Nickname cannot exceed 20 characters." })
    .regex(/^[a-zA-Z0-9_-]+$/, {
      message:
        "Nickname can only contain letters, numbers, dashes (-), and underscores (_).",
    })
    .refine((val) => val.toUpperCase() !== val, {
      message: "Nickname cannot be entirely uppercase.",
    })
    .refine((val) => !val.toLowerCase().includes("lifeqs"), {
      message: "Nickname cannot contain 'lifeqs'.",
    }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters." })
    .regex(/[A-Za-z]/, {
      message: "Password must contain at least one letter.",
    })
    .regex(/[0-9]/, { message: "Password must contain at least one number." }),
  dateOfBirth: z
    .string()
    .refine((value) => !isNaN(Date.parse(value)), {
      message: "Invalid date format.",
    })
    .refine(
      (value) => {
        const today = new Date();
        const birthDate = new Date(value);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        const dayDiff = today.getDate() - birthDate.getDate();
        if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
          age--;
        }
        return age >= 13;
      },
      { message: "The minimum age required to create an account is 13 years." }
    ),
  gender: z.enum(["F", "M"], {
    errorMap: () => ({ message: "Gender must be 'F' or 'M'." }),
  }),
  relationshipStatus: z.enum(
    relationshipStatusOptions as [string, ...string[]],
    {
      required_error: "Relationship status is required.",
    }
  ),
  occupation: z.enum(occupationOptions as [string, ...string[]], {
    required_error: "Occupation is required.",
  }),
  educationLevel: z.enum(educationLevelOptions as [string, ...string[]], {
    required_error: "Education level is required.",
  }),
});

export const SigninValidation = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters." }),
});

export const ForgotPasswordValidation = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});

export const ResetPasswordValidation = z
  .object({
    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters." })
      .regex(/[A-Za-z]/, {
        message: "Password must contain at least one letter.",
      })
      .regex(/[0-9]/, {
        message: "Password must contain at least one number.",
      }),
    confirmPassword: z
      .string()
      .min(8, { message: "Confirm password must be at least 8 characters." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const ProfileValidation = z.object({
  file: z.custom<File[]>(),
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email(),
  bio: z.string().max(150, { message: "Bio must not exceed 150 characters." }),
  dateOfBirth: z
    .string()
    .refine((value) => !isNaN(Date.parse(value)), {
      message: "Invalid date format.",
    })
    .refine(
      (value) => {
        const today = new Date();
        const birthDate = new Date(value);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        const dayDiff = today.getDate() - birthDate.getDate();
        if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
          age--;
        }
        return age >= 13;
      },
      { message: "The minimum age required to create an account is 13 years." }
    ),
  gender: z.enum(["F", "M"], {
    errorMap: () => ({ message: "Gender must be 'F' or 'M'." }),
  }),
  relationshipStatus: z.enum(
    relationshipStatusOptions as [string, ...string[]],
    {
      required_error: "Relationship status is required.",
    }
  ),
  occupation: z.enum(occupationOptions as [string, ...string[]], {
    required_error: "Occupation is required.",
  }),
  educationLevel: z.enum(educationLevelOptions as [string, ...string[]], {
    required_error: "Education level is required.",
  }),
});

// ============================================================
// POST
// ============================================================
export const PostValidation = z.object({
  title: z
    .string()
    .min(15, { message: "Title must be at least 15 characters long" })
    .max(150, { message: "Title cannot exceed 150 characters" }),
  description: z
    .string()
    .max(2000, { message: "Description cannot exceed 2000 characters" })
    .optional(),
  categoryId: z.string().nonempty({ message: "Category is required" }),
  subCategory: z.string().nonempty({ message: "Subcategory is required" }),
  imageUrl: z.string().optional(),
  file: z.any().optional(),
  tags: z.string().optional(),
  isAnonymous: z.boolean().optional(),
  groupId: z.string().optional(),
});

export const PollValidation = z.object({
  question: z.string().min(1, { message: "Question is required" }),
  options: z
    .array(z.string().min(1, { message: "Option cannot be empty" }).max(70, { message: "Option cannot exceed 70 characters" }))
    .min(2, { message: "At least 2 options are required" })
    .max(7, { message: "Maximum 7 options allowed" }), // Changed from 5 to 7
  categoryId: z.string().nonempty({ message: "Category is required" }),
  subCategory: z.string().nonempty({ message: "Subcategory is required" }),
  allowMultipleAnswers: z.boolean(),
  durationInDays: z.number().min(1).max(30).nullable().optional(),
  file: z.any().optional(),
  description: z.string().optional(),
  isAnonymous: z.boolean(),
});

export const GroupValidation = z.object({
  name: z
    .string()
    .transform((val) => val.trim())
    .refine((val) => val.length >= 3, {
      message: "Group name must be at least 3 characters.",
    })
    .refine((val) => val.length <= 150, {
      message: "Group name cannot exceed 150 characters.",
    })
    .refine(async (val) => !(await checkGroupNameExists(val)), {
      message: "This group name is already taken. Please choose another.",
    }),
  description: z
    .string()
    .min(10, { message: "Description must be at least 10 characters." })
    .max(2000, { message: "Description cannot exceed 2000 characters." })
    .transform((val) => val.trim().replace(/\n\s*\n/g, "\n")),
  categoryId: z.string().nonempty({ message: "Category is required." }),
  subCategory: z.string().nonempty({ message: "Subcategory is required." }),
  tags: z.string().optional(),
  file: z.any().optional(),
});
//======================================================================================
export const CompleteProfileValidation = z.object({
  dateOfBirth: z
    .string()
    .refine((value) => !isNaN(Date.parse(value)), {
      message: "Invalid date format.",
    })
    .refine(
      (value) => {
        const today = new Date();
        const birthDate = new Date(value);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        const dayDiff = today.getDate() - birthDate.getDate();
        if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
          age--;
        }
        return age >= 13;
      },
      { message: "The minimum age required to create an account is 13 years." }
    ),
  gender: z.enum(["F", "M"], {
    errorMap: () => ({ message: "Gender must be 'F' or 'M'." }),
  }),
  relationshipStatus: z.enum(
    relationshipStatusOptions as [string, ...string[]],
    {
      required_error: "Relationship status is required.",
    }
  ),
  occupation: z.enum(occupationOptions as [string, ...string[]], {
    required_error: "Occupation is required.",
  }),
  educationLevel: z.enum(educationLevelOptions as [string, ...string[]], {
    required_error: "Education level is required.",
  }),
  name: z
    .string()
    .min(3, { message: "Nickname must be at least 3 characters." })
    .max(20, { message: "Nickname cannot exceed 20 characters." })
    .regex(/^[a-zA-Z0-9_-]+$/, {
      message:
        "Nickname can only contain letters, numbers, dashes (-), and underscores (_).",
    })
    .refine((val) => val.toUpperCase() !== val, {
      message: "Nickname cannot be entirely uppercase.",
    })
    .refine((val) => !val.toLowerCase().includes("lifeqs"), {
      message: "Nickname cannot contain 'lifeqs'.",
    })
    .optional(),
});
