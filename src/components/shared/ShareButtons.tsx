import {
  FacebookShareButton,
  FacebookIcon,
  TwitterShareButton,
  TwitterIcon,
  WhatsappShareButton,
  WhatsappIcon,
} from "react-share";

type ShareButtonsProps = {
  shareUrl: string;
  shareContent: string;
  handleCopyLink: (url: string, itemId: string) => void;
  postId: string;
};

const ShareButtons = ({
  shareUrl,
  shareContent,
  handleCopyLink,
  postId,
}: ShareButtonsProps) => {
  return (
    <div className="flex gap-2 mt-2">
      <FacebookShareButton url={shareUrl}>
        <FacebookIcon size={20} round />
      </FacebookShareButton>
      <TwitterShareButton url={shareUrl} title={shareContent}>
        <TwitterIcon size={20} round />
      </TwitterShareButton>
      <button
        onClick={() => handleCopyLink(shareUrl, postId)}
        className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300"
        title="Copy link for Instagram">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      </button>
      <WhatsappShareButton url={shareUrl} title={shareContent}>
        <WhatsappIcon size={20} round />
      </WhatsappShareButton>
    </div>
  );
};

export default ShareButtons;
