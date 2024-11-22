import * as req from '@app/lib/types/req.ts';
import * as res from '@app/lib/types/res.ts';
import type { App } from '@app/routes/type.ts';

export function addSchemas(app: App) {
  app.addSchema(res.BlogEntry);
  app.addSchema(res.Character);
  app.addSchema(res.CharacterRelation);
  app.addSchema(res.CharacterSubject);
  app.addSchema(res.CharacterSubjectRelation);
  app.addSchema(res.Episode);
  app.addSchema(res.Error);
  app.addSchema(res.Friend);
  app.addSchema(res.Index);
  app.addSchema(res.Infobox);
  app.addSchema(res.Person);
  app.addSchema(res.PersonCharacter);
  app.addSchema(res.PersonCollect);
  app.addSchema(res.PersonImages);
  app.addSchema(res.PersonRelation);
  app.addSchema(res.PersonWork);
  app.addSchema(res.SlimBlogEntry);
  app.addSchema(res.SlimCharacter);
  app.addSchema(res.SlimIndex);
  app.addSchema(res.SlimPerson);
  app.addSchema(res.SlimSubject);
  app.addSchema(res.SlimUser);
  app.addSchema(res.Subject);
  app.addSchema(res.SubjectAirtime);
  app.addSchema(res.SubjectCharacter);
  app.addSchema(res.SubjectCollection);
  app.addSchema(res.SubjectComment);
  app.addSchema(res.SubjectImages);
  app.addSchema(res.SubjectPlatform);
  app.addSchema(res.SubjectRating);
  app.addSchema(res.SubjectRelation);
  app.addSchema(res.SubjectRelationType);
  app.addSchema(res.SubjectStaff);
  app.addSchema(res.SubjectStaffPosition);
  app.addSchema(res.User);
  app.addSchema(res.Topic);

  app.addSchema(req.TopicCreation);
}
