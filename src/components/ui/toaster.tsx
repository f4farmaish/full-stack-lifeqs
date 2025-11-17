import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast variant="default" width="wide" key={id} {...props} className="white-space-normal" >
            <div className="flex flex-col gap-1">
              {title && (
                <ToastTitle className="white-space-normal word-break-keep-all">
                  {title}
                </ToastTitle>
              )}
              {description && (
                <ToastDescription className="white-space-normal word-break-keep-all">
                  {description}
                </ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
