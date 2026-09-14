import type { AvatarMetadata } from '../types/avatar';

/**
 * Builds the VRMC_vrm `meta` block from our simplified metadata form
 * (spec §19). VRM 1.0 meta requires an explicit set of permission enums;
 * we default those to the most common "personal, non-commercial, everyone"
 * profile and only vary avatarPermission based on the free-text license
 * field, since asking a beginner to fill in a full VRM permission matrix
 * would contradict the "3D知識ゼロでも" goal (spec §59).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildVrmMeta(metadata: AvatarMetadata): any {
  const licenseLower = metadata.license.toLowerCase();
  const personalOnly = licenseLower.includes('personal') || licenseLower.includes('個人');
  const allowsRedistribution = licenseLower.includes('cc0') || licenseLower.includes('cc-by');

  return {
    name: metadata.name || 'My Chibi Avatar',
    version: metadata.version || '1.0',
    authors: [metadata.author || 'User'],
    contactInformation: metadata.contactInformation || undefined,
    licenseUrl: 'https://vrm.dev/licenses/1.0/',
    avatarPermission: personalOnly ? 'onlyAuthor' : 'everyone',
    allowExcessivelyViolentUsage: false,
    allowExcessivelySexualUsage: false,
    commercialUsageName: 'personalNonProfit',
    allowPoliticalOrReligiousUsage: false,
    allowAntisocialOrHateUsage: false,
    creditNotation: 'required',
    allowRedistribution: allowsRedistribution,
    modification: allowsRedistribution ? 'allowModification' : 'prohibited',
    otherLicenseUrl: undefined,
  };
}
