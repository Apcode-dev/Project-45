import { toast, ToastOptions } from "react-toastify";

const defaultOptions: ToastOptions = {
  position: "top-right",
  autoClose: 3200,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  theme: "colored",
};

export const showToast = {
  success: (message: string, options?: ToastOptions) =>
    toast.success(message, { ...defaultOptions, ...options }),
  error: (message: string, options?: ToastOptions) =>
    toast.error(message, { ...defaultOptions, ...options }),
  warning: (message: string, options?: ToastOptions) =>
    toast.warning(message, { ...defaultOptions, ...options }),
  info: (message: string, options?: ToastOptions) =>
    toast.info(message, { ...defaultOptions, ...options }),
};

export { toast };
