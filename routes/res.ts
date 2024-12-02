import * as req from '@app/lib/types/req.ts';
import * as res from '@app/lib/types/res.ts';
import type { App } from '@app/routes/type.ts';

export function addSchemas(app: App) {
  app.addSchema(res.Avatar);
  app.addSchema(res.Character);
  app.addSchema(res.CharacterRelation);
  app.addSchema(res.CharacterSubject);
  app.addSchema(res.CharacterSubjectRelation);
  app.addSchema(res.Episode);
  app.addSchema(res.Error);
  app.addSchema(res.Friend);
  app.addSchema(res.Group);
  app.addSchema(res.GroupMember);
  app.addSchema(res.Index);
  app.addSchema(res.IndexStats);
  app.addSchema(res.Infobox);
  app.addSchema(res.Person);
  app.addSchema(res.PersonCharacter);
  app.addSchema(res.PersonCollect);
  app.addSchema(res.PersonImages);
  app.addSchema(res.PersonRelation);
  app.addSchema(res.PersonWork);
  app.addSchema(res.Reaction);
  app.addSchema(res.Reply);
  app.addSchema(res.SlimCharacter);
  app.addSchema(res.SlimIndex);
  app.addSchema(res.SlimPerson);
  app.addSchema(res.SlimSubject);
  app.addSchema(res.SlimUser);
  app.addSchema(res.SubReply);
  app.addSchema(res.Subject);
  app.addSchema(res.SubjectAirtime);
  app.addSchema(res.SubjectCharacter);
  app.addSchema(res.SubjectCollection);
  app.addSchema(res.SubjectComment);
  app.addSchema(res.SubjectImages);
  app.addSchema(res.SubjectPlatform);
  app.addSchema(res.SubjectRating);
  app.addSchema(res.SubjectRec);
  app.addSchema(res.SubjectRelation);
  app.addSchema(res.SubjectRelationType);
  app.addSchema(res.SubjectStaff);
  app.addSchema(res.SubjectStaffPosition);
  app.addSchema(res.SubjectTag);
  app.addSchema(res.Topic);
  app.addSchema(res.TopicDetail);
  app.addSchema(res.User);
  app.addSchema(res.UserHomepage);

  app.addSchema(req.CreateTopic);
  app.addSchema(req.UpdateTopic);
}
