import React, { useState } from 'react';
import { ContactFormData } from '@/types';
import { Button } from '@/components/ui/button';
import { useSendContactEmail } from '@/lib/react-query/queries';

interface ContactFormProps {
  onClose: () => void;
}

const ContactForm: React.FC<ContactFormProps> = ({ onClose }) => {
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    topic: 'Help',
    message: '',
  });
  const [errors, setErrors] = useState<Partial<ContactFormData>>({});
  
  const { mutate: sendEmail, isPending, isSuccess, error } = useSendContactEmail();

  const validateForm = (): boolean => {
    const newErrors: Partial<ContactFormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters long';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error when user starts typing
    if (errors[name as keyof ContactFormData]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    sendEmail(formData, {
      onSuccess: (response) => {
        if (response.success) {
          // Reset form after successful submission
          setFormData({
            name: '',
            email: '',
            topic: 'Help',
            message: '',
          });
          // Close form after 2 seconds to show success message
          setTimeout(() => {
            onClose();
          }, 2000);
        }
      },
      onError: (error) => {
        console.error('Error submitting contact form:', error);
      }
    });
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-dark-3 rounded-lg p-6 max-w-md w-full">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-secondary-500/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-secondary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-light-1 mb-2">Message Sent Successfully!</h3>
            <p className="text-light-3 mb-4">
              Thank you for contacting us. We will get back to you soon.
            </p>
            <Button onClick={onClose} className="w-full">
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-3 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-light-1">Contact Us</h2>
          <button
            onClick={onClose}
            className="text-light-3 hover:text-light-1 text-2xl font-bold"
            disabled={isPending}
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red/20 border border-red text-red-300 rounded">
            {error instanceof Error ? error.message : 'Failed to send message. Please try again.'}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-light-3 mb-1">
              Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-dark-4 border-dark-4 text-light-1 ${
                errors.name ? 'border-red' : ''
              }`}
              disabled={isPending}
              placeholder="Your full name"
            />
            {errors.name && <p className="text-red text-xs mt-1">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-light-3 mb-1">
              Email *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-dark-4 border-dark-4 text-light-1 ${
                errors.email ? 'border-red' : ''
              }`}
              disabled={isPending}
              placeholder="your.email@example.com"
            />
            {errors.email && <p className="text-red text-xs mt-1">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="topic" className="block text-sm font-medium text-light-3 mb-1">
              Topic *
            </label>
            <select
              id="topic"
              name="topic"
              value={formData.topic}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-dark-4 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-dark-4 text-light-1"
              disabled={isPending}
            >
              <option value="Help">Help</option>
              <option value="Advertise/Partnership">Advertise/Partnership</option>
              <option value="Report bug or vulnerability">Report bug or vulnerability</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium text-light-3 mb-1">
              Message *
            </label>
            <textarea
              id="message"
              name="message"
              rows={4}
              value={formData.message}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-dark-4 border-dark-4 text-light-1 ${
                errors.message ? 'border-red' : ''
              }`}
              disabled={isPending}
              placeholder="Please describe your inquiry in detail..."
            />
            {errors.message && <p className="text-red text-xs mt-1">{errors.message}</p>}
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 bg-dark-4 hover:bg-dark-3 text-light-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="flex-1 bg-primary-600 hover:bg-primary-500 text-light-1"
            >
              {isPending ? 'Sending...' : 'Send Message'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContactForm;