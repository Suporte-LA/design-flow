import { Dialog, DialogContent } from '@/components/ui/dialog';

interface ImageLightboxProps {
  src: string | null;
  open: boolean;
  onClose: () => void;
}

export default function ImageLightbox({ src, open, onClose }: ImageLightboxProps) {
  if (!src) return null;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl p-2 bg-background/95 backdrop-blur-sm border-border">
        <img
          src={src}
          alt="Foto do chamado"
          className="w-full max-h-[80vh] object-contain rounded-md"
        />
      </DialogContent>
    </Dialog>
  );
}
