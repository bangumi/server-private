import * as common from '@app/lib/types/common.ts';
import * as req from '@app/lib/types/req.ts';
import * as res from '@app/lib/types/res.ts';
import type { App } from '@app/routes/type.ts';

export function addSchemas(app: App) {
  addCommonSchemas(app);
  addRequestSchemas(app);
  addResponseSchemas(app);
}

function addCommonSchemas(app: App) {
  app.addSchema(common.CollectionType);
  app.addSchema(common.EpisodeCollectionStatus);
  app.addSchema(common.EpisodeType);
  app.addSchema(common.EpisodeWikiInfo);
  app.addSchema(common.GroupMemberRole);
  app.addSchema(common.IndexRelatedCategory);
  app.addSchema(common.IndexType);
  app.addSchema(common.SubjectType);
}

function addRequestSchemas(app: App) {
  app.addSchema(req.CharacterSearchFilter);
  app.addSchema(req.CollectSubject);
  app.addSchema(req.CreateContent);
  app.addSchema(req.CreateReply);
  app.addSchema(req.CreateTopic);
  app.addSchema(req.FilterMode);
  app.addSchema(req.GroupFilterMode);
  app.addSchema(req.GroupSort);
  app.addSchema(req.GroupTopicFilterMode);
  app.addSchema(req.PersonSearchFilter);
  app.addSchema(req.SearchCharacter);
  app.addSchema(req.SearchPerson);
  app.addSchema(req.SearchSubject);
  app.addSchema(req.SubjectBrowseSort);
  app.addSchema(req.SubjectSearchFilter);
  app.addSchema(req.SubjectSearchSort);
  app.addSchema(req.TurnstileToken);
  app.addSchema(req.UpdateContent);
  app.addSchema(req.UpdateEpisodeProgress);
  app.addSchema(req.UpdateSubjectProgress);
  app.addSchema(req.UpdateTopic);
}

function addResponseSchemas(app: App) {
  app.addSchema(res.Avatar);
  app.addSchema(res.BlogEntry);
  app.addSchema(res.BlogPhoto);
  app.addSchema(res.Character);
  app.addSchema(res.CharacterRelation);
  app.addSchema(res.CharacterSubject);
  app.addSchema(res.CharacterSubjectRelation);
  app.addSchema(res.Comment);
  app.addSchema(res.Episode);
  app.addSchema(res.Error);
  app.addSchema(res.Friend);
  app.addSchema(res.Group);
  app.addSchema(res.GroupMember);
  app.addSchema(res.GroupTopic);
  app.addSchema(res.Index);
  app.addSchema(res.IndexRelated);
  app.addSchema(res.IndexStats);
  app.addSchema(res.Infobox);
  app.addSchema(res.Notice);
  app.addSchema(res.Permissions);
  app.addSchema(res.Person);
  app.addSchema(res.PersonCharacter);
  app.addSchema(res.PersonCollect);
  app.addSchema(res.PersonImages);
  app.addSchema(res.PersonRelation);
  app.addSchema(res.PersonWork);
  app.addSchema(res.Post);
  app.addSchema(res.Profile);
  app.addSchema(res.Reaction);
  app.addSchema(res.Reply);
  app.addSchema(res.ReplyBase);
  app.addSchema(res.SimpleUser);
  app.addSchema(res.SlimBlogEntry);
  app.addSchema(res.SlimCharacter);
  app.addSchema(res.SlimGroup);
  app.addSchema(res.SlimIndex);
  app.addSchema(res.SlimPerson);
  app.addSchema(res.SlimSubject);
  app.addSchema(res.SlimSubjectInterest);
  app.addSchema(res.SlimUser);
  app.addSchema(res.Subject);
  app.addSchema(res.SubjectAirtime);
  app.addSchema(res.SubjectCharacter);
  app.addSchema(res.SubjectCollect);
  app.addSchema(res.SubjectCollection);
  app.addSchema(res.SubjectImages);
  app.addSchema(res.SubjectInterest);
  app.addSchema(res.SubjectInterestComment);
  app.addSchema(res.SubjectPlatform);
  app.addSchema(res.SubjectPosition);
  app.addSchema(res.SubjectPositionStaff);
  app.addSchema(res.SubjectRating);
  app.addSchema(res.SubjectRec);
  app.addSchema(res.SubjectRelation);
  app.addSchema(res.SubjectRelationType);
  app.addSchema(res.SubjectReview);
  app.addSchema(res.SubjectStaff);
  app.addSchema(res.SubjectStaffPosition);
  app.addSchema(res.SubjectStaffPositionType);
  app.addSchema(res.SubjectTag);
  app.addSchema(res.SubjectTopic);
  app.addSchema(res.Timeline);
  app.addSchema(res.TimelineCat);
  app.addSchema(res.TimelineMemo);
  app.addSchema(res.TimelineSource);
  app.addSchema(res.Topic);
  app.addSchema(res.User);
  app.addSchema(res.UserHomepage);
  app.addSchema(res.UserHomepageSection);
  app.addSchema(res.UserIndexStats);
  app.addSchema(res.UserMonoCollectionStats);
  app.addSchema(res.UserStats);
  app.addSchema(res.UserSubjectCollectionStats);
}
