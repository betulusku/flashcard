import React from 'react';
import {
  Award,
  Bell,
  Bookmark,
  BookOpen,
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Camera,
  CloudRain,
  Copy,
  Edit2,
  FileText,
  Filter,
  Globe,
  Mail,
  Menu,
  Plus,
  RefreshCw,
  Search,
  Share2,
  Shield,
  Star,
  Type,
  User,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'react-native-feather';
import type {IconProps} from 'react-native-feather';
import {colors} from '../theme';

export type IconPropsLite = Pick<IconProps, 'size' | 'color' | 'strokeWidth' | 'fill'>;

/** Matches the Home app-bar stroke weight the product settled on. */
const defaults = {size: 22, color: colors.mint, strokeWidth: 1.75} as const;

/** Feather icons — https://feathericons.com */
export const Icon = {
  Volume2: (props: IconPropsLite) => <Volume2 {...defaults} {...props} />,
  VolumeX: (props: IconPropsLite) => <VolumeX {...defaults} {...props} />,
  Star: (props: IconPropsLite) => <Star {...defaults} {...props} />,
  ChevronLeft: (props: IconPropsLite) => <ChevronLeft {...defaults} {...props} />,
  ChevronRight: (props: IconPropsLite) => <ChevronRight {...defaults} {...props} />,
  Filter: (props: IconPropsLite) => <Filter {...defaults} {...props} />,
  Search: (props: IconPropsLite) => <Search {...defaults} {...props} />,
  Check: (props: IconPropsLite) => <Check {...defaults} {...props} />,
  CheckCircle: (props: IconPropsLite) => <CheckCircle {...defaults} {...props} />,
  Close: (props: IconPropsLite) => <X {...defaults} {...props} />,
  Type: (props: IconPropsLite) => <Type {...defaults} {...props} />,
  Bookmark: (props: IconPropsLite) => <Bookmark {...defaults} {...props} />,
  BookOpen: (props: IconPropsLite) => <BookOpen {...defaults} {...props} />,
  RefreshCw: (props: IconPropsLite) => <RefreshCw {...defaults} {...props} />,
  Award: (props: IconPropsLite) => <Award {...defaults} {...props} />,
  CloudRain: (props: IconPropsLite) => <CloudRain {...defaults} {...props} />,
  Menu: (props: IconPropsLite) => <Menu {...defaults} {...props} />,
  Bell: (props: IconPropsLite) => <Bell {...defaults} {...props} />,
  Plus: (props: IconPropsLite) => <Plus {...defaults} {...props} />,
  Users: (props: IconPropsLite) => <Users {...defaults} {...props} />,
  Globe: (props: IconPropsLite) => <Globe {...defaults} {...props} />,
  Mail: (props: IconPropsLite) => <Mail {...defaults} {...props} />,
  Shield: (props: IconPropsLite) => <Shield {...defaults} {...props} />,
  FileText: (props: IconPropsLite) => <FileText {...defaults} {...props} />,
  Copy: (props: IconPropsLite) => <Copy {...defaults} {...props} />,
  User: (props: IconPropsLite) => <User {...defaults} {...props} />,
  Share2: (props: IconPropsLite) => <Share2 {...defaults} {...props} />,
  Edit2: (props: IconPropsLite) => <Edit2 {...defaults} {...props} />,
  Camera: (props: IconPropsLite) => <Camera {...defaults} {...props} />,
};

export type FeatherIconName = keyof typeof Icon;
