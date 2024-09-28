import type { GraphQLResolveInfo } from 'graphql';
import type { Context } from '@app/lib/graphql/context.ts';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = {
  [_ in K]?: never;
};
export type Incremental<T> =
  | T
  | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
};

export type Avatar = {
  __typename?: 'Avatar';
  large: Scalars['String']['output'];
  medium: Scalars['String']['output'];
  small: Scalars['String']['output'];
};

export type Character = {
  __typename?: 'Character';
  collects: Scalars['Int']['output'];
  comment: Scalars['Int']['output'];
  id: Scalars['Int']['output'];
  images?: Maybe<Images>;
  infobox?: Maybe<Array<Infobox>>;
  last_post: Scalars['Int']['output'];
  lock: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  nsfw: Scalars['Boolean']['output'];
  persons?: Maybe<Array<CharacterRelatedPerson>>;
  redirect: Scalars['Int']['output'];
  role: Scalars['Int']['output'];
  subjects?: Maybe<Array<CharacterRelatedSubject>>;
  summary: Scalars['String']['output'];
};

export type CharacterPersonsArgs = {
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
};

export type CharacterSubjectsArgs = {
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
};

export type CharacterRelatedPerson = {
  __typename?: 'CharacterRelatedPerson';
  person: SlimPerson;
  subject: SlimSubject;
  summary: Scalars['String']['output'];
};

export type CharacterRelatedSubject = {
  __typename?: 'CharacterRelatedSubject';
  order: Scalars['Int']['output'];
  subject: SlimSubject;
  type: Scalars['Int']['output'];
};

export type Episode = {
  __typename?: 'Episode';
  airdate: Scalars['String']['output'];
  comment: Scalars['Int']['output'];
  description: Scalars['String']['output'];
  disc: Scalars['Int']['output'];
  duration: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  last_post: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  name_cn: Scalars['String']['output'];
  sort: Scalars['Float']['output'];
  type: Scalars['Int']['output'];
};

export type Images = {
  __typename?: 'Images';
  grid: Scalars['String']['output'];
  large: Scalars['String']['output'];
  medium: Scalars['String']['output'];
  small: Scalars['String']['output'];
};

export type Infobox = {
  __typename?: 'Infobox';
  key: Scalars['String']['output'];
  values?: Maybe<Array<InfoboxValue>>;
};

export type InfoboxValue = {
  __typename?: 'InfoboxValue';
  k?: Maybe<Scalars['String']['output']>;
  v?: Maybe<Scalars['String']['output']>;
};

export type Person = {
  __typename?: 'Person';
  career: Array<Scalars['String']['output']>;
  characters?: Maybe<Array<PersonRelatedCharacter>>;
  collects: Scalars['Int']['output'];
  comment: Scalars['Int']['output'];
  id: Scalars['Int']['output'];
  images?: Maybe<Images>;
  infobox?: Maybe<Array<Infobox>>;
  last_post: Scalars['Int']['output'];
  lock: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  nsfw: Scalars['Boolean']['output'];
  redirect: Scalars['Int']['output'];
  subjects?: Maybe<Array<PersonRelatedSubject>>;
  summary: Scalars['String']['output'];
  type: Scalars['Int']['output'];
};

export type PersonCharactersArgs = {
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
};

export type PersonSubjectsArgs = {
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
};

export type PersonRelatedCharacter = {
  __typename?: 'PersonRelatedCharacter';
  character: SlimCharacter;
  subject: SlimSubject;
  summary: Scalars['String']['output'];
};

export type PersonRelatedSubject = {
  __typename?: 'PersonRelatedSubject';
  position: Scalars['Int']['output'];
  subject: SlimSubject;
};

export type Query = {
  __typename?: 'Query';
  character?: Maybe<Character>;
  me?: Maybe<User>;
  person?: Maybe<Person>;
  subject?: Maybe<Subject>;
};

export type QueryCharacterArgs = {
  id: Scalars['Int']['input'];
};

export type QueryPersonArgs = {
  id: Scalars['Int']['input'];
};

export type QuerySubjectArgs = {
  id: Scalars['Int']['input'];
};

/** Basic character info as field of other types to avoid recursive query */
export type SlimCharacter = {
  __typename?: 'SlimCharacter';
  collects: Scalars['Int']['output'];
  comment: Scalars['Int']['output'];
  id: Scalars['Int']['output'];
  images?: Maybe<Images>;
  infobox?: Maybe<Array<Infobox>>;
  last_post: Scalars['Int']['output'];
  lock: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  nsfw: Scalars['Boolean']['output'];
  redirect: Scalars['Int']['output'];
  role: Scalars['Int']['output'];
  summary: Scalars['String']['output'];
};

/** Basic person info as field of other types to avoid recursive query */
export type SlimPerson = {
  __typename?: 'SlimPerson';
  career: Array<Scalars['String']['output']>;
  collects: Scalars['Int']['output'];
  comment: Scalars['Int']['output'];
  id: Scalars['Int']['output'];
  images?: Maybe<Images>;
  infobox?: Maybe<Array<Infobox>>;
  last_post: Scalars['Int']['output'];
  lock: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  nsfw: Scalars['Boolean']['output'];
  redirect: Scalars['Int']['output'];
  summary: Scalars['String']['output'];
  type: Scalars['Int']['output'];
};

/** A subject as field of other types to avoid recursive query */
export type SlimSubject = {
  __typename?: 'SlimSubject';
  airtime: SubjectAirtime;
  eps: Scalars['Int']['output'];
  id: Scalars['Int']['output'];
  images?: Maybe<SubjectImages>;
  infobox?: Maybe<Array<Infobox>>;
  locked: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  name_cn: Scalars['String']['output'];
  nsfw: Scalars['Boolean']['output'];
  platform: SubjectPlatform;
  rating: SubjectRating;
  redirect: Scalars['Int']['output'];
  series: Scalars['Boolean']['output'];
  series_entry: Scalars['Int']['output'];
  summary: Scalars['String']['output'];
  type: Scalars['Int']['output'];
  volumes: Scalars['Int']['output'];
};

export type Subject = {
  __typename?: 'Subject';
  airtime: SubjectAirtime;
  characters?: Maybe<Array<SubjectRelatedCharacter>>;
  collection: SubjectCollection;
  episodes?: Maybe<Array<Episode>>;
  eps: Scalars['Int']['output'];
  id: Scalars['Int']['output'];
  images?: Maybe<SubjectImages>;
  infobox?: Maybe<Array<Infobox>>;
  locked: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  name_cn: Scalars['String']['output'];
  nsfw: Scalars['Boolean']['output'];
  persons?: Maybe<Array<SubjectRelatedPerson>>;
  platform: SubjectPlatform;
  rating: SubjectRating;
  redirect: Scalars['Int']['output'];
  relations?: Maybe<Array<SubjectRelation>>;
  series: Scalars['Boolean']['output'];
  series_entry: Scalars['Int']['output'];
  summary: Scalars['String']['output'];
  tags: Array<SubjectTag>;
  topics?: Maybe<Array<SubjectTopic>>;
  type: Scalars['Int']['output'];
  volumes: Scalars['Int']['output'];
};

export type SubjectCharactersArgs = {
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
};

export type SubjectEpisodesArgs = {
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
  type?: InputMaybe<Scalars['Int']['input']>;
};

export type SubjectPersonsArgs = {
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
};

export type SubjectRelationsArgs = {
  excludeTypes?: InputMaybe<Array<Scalars['Int']['input']>>;
  includeTypes?: InputMaybe<Array<Scalars['Int']['input']>>;
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
};

export type SubjectTagsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};

export type SubjectTopicsArgs = {
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
};

export type SubjectAirtime = {
  __typename?: 'SubjectAirtime';
  date: Scalars['String']['output'];
  month: Scalars['Int']['output'];
  weekday: Scalars['Int']['output'];
  year: Scalars['Int']['output'];
};

export type SubjectCollection = {
  __typename?: 'SubjectCollection';
  collect: Scalars['Int']['output'];
  doing: Scalars['Int']['output'];
  dropped: Scalars['Int']['output'];
  on_hold: Scalars['Int']['output'];
  wish: Scalars['Int']['output'];
};

export type SubjectImages = {
  __typename?: 'SubjectImages';
  common: Scalars['String']['output'];
  grid: Scalars['String']['output'];
  large: Scalars['String']['output'];
  medium: Scalars['String']['output'];
  small: Scalars['String']['output'];
};

export type SubjectPlatform = {
  __typename?: 'SubjectPlatform';
  alias?: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  type: Scalars['String']['output'];
  type_cn?: Maybe<Scalars['String']['output']>;
};

export type SubjectRating = {
  __typename?: 'SubjectRating';
  count?: Maybe<Array<Scalars['Int']['output']>>;
  rank: Scalars['Int']['output'];
  score: Scalars['Float']['output'];
  total: Scalars['Int']['output'];
};

export type SubjectRelatedCharacter = {
  __typename?: 'SubjectRelatedCharacter';
  character: SlimCharacter;
  order: Scalars['Int']['output'];
  type: Scalars['Int']['output'];
};

export type SubjectRelatedPerson = {
  __typename?: 'SubjectRelatedPerson';
  person: SlimPerson;
  position: Scalars['Int']['output'];
};

export type SubjectRelation = {
  __typename?: 'SubjectRelation';
  order: Scalars['Int']['output'];
  relation: Scalars['Int']['output'];
  subject: SlimSubject;
};

export type SubjectTag = {
  __typename?: 'SubjectTag';
  count: Scalars['Int']['output'];
  name: Scalars['String']['output'];
};

export type SubjectTopic = {
  __typename?: 'SubjectTopic';
  created_at: Scalars['Int']['output'];
  creator: User;
  display: Scalars['Int']['output'];
  id: Scalars['Int']['output'];
  replies: Scalars['Int']['output'];
  state: Scalars['Int']['output'];
  title: Scalars['String']['output'];
  updated_at: Scalars['Int']['output'];
};

export type User = {
  __typename?: 'User';
  avatar: Avatar;
  id: Scalars['Int']['output'];
  nickname: Scalars['String']['output'];
  username: Scalars['String']['output'];
};

export type ResolverTypeWrapper<T> = Promise<T> | T;

export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> =
  | ResolverFn<TResult, TParent, TContext, TArgs>
  | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<
  TResult,
  TKey extends string,
  TParent,
  TContext,
  TArgs,
> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<
  TResult,
  TKey extends string,
  TParent = {},
  TContext = {},
  TArgs = {},
> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo,
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (
  obj: T,
  context: TContext,
  info: GraphQLResolveInfo,
) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => TResult | Promise<TResult>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  Avatar: ResolverTypeWrapper<Avatar>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  Character: ResolverTypeWrapper<Character>;
  CharacterRelatedPerson: ResolverTypeWrapper<CharacterRelatedPerson>;
  CharacterRelatedSubject: ResolverTypeWrapper<CharacterRelatedSubject>;
  Episode: ResolverTypeWrapper<Episode>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  Images: ResolverTypeWrapper<Images>;
  Infobox: ResolverTypeWrapper<Infobox>;
  InfoboxValue: ResolverTypeWrapper<InfoboxValue>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  Person: ResolverTypeWrapper<Person>;
  PersonRelatedCharacter: ResolverTypeWrapper<PersonRelatedCharacter>;
  PersonRelatedSubject: ResolverTypeWrapper<PersonRelatedSubject>;
  Query: ResolverTypeWrapper<{}>;
  SlimCharacter: ResolverTypeWrapper<SlimCharacter>;
  SlimPerson: ResolverTypeWrapper<SlimPerson>;
  SlimSubject: ResolverTypeWrapper<SlimSubject>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Subject: ResolverTypeWrapper<Subject>;
  SubjectAirtime: ResolverTypeWrapper<SubjectAirtime>;
  SubjectCollection: ResolverTypeWrapper<SubjectCollection>;
  SubjectImages: ResolverTypeWrapper<SubjectImages>;
  SubjectPlatform: ResolverTypeWrapper<SubjectPlatform>;
  SubjectRating: ResolverTypeWrapper<SubjectRating>;
  SubjectRelatedCharacter: ResolverTypeWrapper<SubjectRelatedCharacter>;
  SubjectRelatedPerson: ResolverTypeWrapper<SubjectRelatedPerson>;
  SubjectRelation: ResolverTypeWrapper<SubjectRelation>;
  SubjectTag: ResolverTypeWrapper<SubjectTag>;
  SubjectTopic: ResolverTypeWrapper<SubjectTopic>;
  User: ResolverTypeWrapper<User>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  Avatar: Avatar;
  Boolean: Scalars['Boolean']['output'];
  Character: Character;
  CharacterRelatedPerson: CharacterRelatedPerson;
  CharacterRelatedSubject: CharacterRelatedSubject;
  Episode: Episode;
  Float: Scalars['Float']['output'];
  Images: Images;
  Infobox: Infobox;
  InfoboxValue: InfoboxValue;
  Int: Scalars['Int']['output'];
  Person: Person;
  PersonRelatedCharacter: PersonRelatedCharacter;
  PersonRelatedSubject: PersonRelatedSubject;
  Query: {};
  SlimCharacter: SlimCharacter;
  SlimPerson: SlimPerson;
  SlimSubject: SlimSubject;
  String: Scalars['String']['output'];
  Subject: Subject;
  SubjectAirtime: SubjectAirtime;
  SubjectCollection: SubjectCollection;
  SubjectImages: SubjectImages;
  SubjectPlatform: SubjectPlatform;
  SubjectRating: SubjectRating;
  SubjectRelatedCharacter: SubjectRelatedCharacter;
  SubjectRelatedPerson: SubjectRelatedPerson;
  SubjectRelation: SubjectRelation;
  SubjectTag: SubjectTag;
  SubjectTopic: SubjectTopic;
  User: User;
};

export type AvatarResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['Avatar'] = ResolversParentTypes['Avatar'],
> = {
  large?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  medium?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  small?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CharacterResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['Character'] = ResolversParentTypes['Character'],
> = {
  collects?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  comment?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  images?: Resolver<Maybe<ResolversTypes['Images']>, ParentType, ContextType>;
  infobox?: Resolver<Maybe<Array<ResolversTypes['Infobox']>>, ParentType, ContextType>;
  last_post?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  lock?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  nsfw?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  persons?: Resolver<
    Maybe<Array<ResolversTypes['CharacterRelatedPerson']>>,
    ParentType,
    ContextType,
    RequireFields<CharacterPersonsArgs, 'limit' | 'offset'>
  >;
  redirect?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  role?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  subjects?: Resolver<
    Maybe<Array<ResolversTypes['CharacterRelatedSubject']>>,
    ParentType,
    ContextType,
    RequireFields<CharacterSubjectsArgs, 'limit' | 'offset'>
  >;
  summary?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CharacterRelatedPersonResolvers<
  ContextType = Context,
  ParentType extends
    ResolversParentTypes['CharacterRelatedPerson'] = ResolversParentTypes['CharacterRelatedPerson'],
> = {
  person?: Resolver<ResolversTypes['SlimPerson'], ParentType, ContextType>;
  subject?: Resolver<ResolversTypes['SlimSubject'], ParentType, ContextType>;
  summary?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CharacterRelatedSubjectResolvers<
  ContextType = Context,
  ParentType extends
    ResolversParentTypes['CharacterRelatedSubject'] = ResolversParentTypes['CharacterRelatedSubject'],
> = {
  order?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  subject?: Resolver<ResolversTypes['SlimSubject'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type EpisodeResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['Episode'] = ResolversParentTypes['Episode'],
> = {
  airdate?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  comment?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  disc?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  duration?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  last_post?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  name_cn?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sort?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ImagesResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['Images'] = ResolversParentTypes['Images'],
> = {
  grid?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  large?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  medium?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  small?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type InfoboxResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['Infobox'] = ResolversParentTypes['Infobox'],
> = {
  key?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  values?: Resolver<Maybe<Array<ResolversTypes['InfoboxValue']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type InfoboxValueResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['InfoboxValue'] = ResolversParentTypes['InfoboxValue'],
> = {
  k?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  v?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PersonResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['Person'] = ResolversParentTypes['Person'],
> = {
  career?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  characters?: Resolver<
    Maybe<Array<ResolversTypes['PersonRelatedCharacter']>>,
    ParentType,
    ContextType,
    RequireFields<PersonCharactersArgs, 'limit' | 'offset'>
  >;
  collects?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  comment?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  images?: Resolver<Maybe<ResolversTypes['Images']>, ParentType, ContextType>;
  infobox?: Resolver<Maybe<Array<ResolversTypes['Infobox']>>, ParentType, ContextType>;
  last_post?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  lock?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  nsfw?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  redirect?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  subjects?: Resolver<
    Maybe<Array<ResolversTypes['PersonRelatedSubject']>>,
    ParentType,
    ContextType,
    RequireFields<PersonSubjectsArgs, 'limit' | 'offset'>
  >;
  summary?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PersonRelatedCharacterResolvers<
  ContextType = Context,
  ParentType extends
    ResolversParentTypes['PersonRelatedCharacter'] = ResolversParentTypes['PersonRelatedCharacter'],
> = {
  character?: Resolver<ResolversTypes['SlimCharacter'], ParentType, ContextType>;
  subject?: Resolver<ResolversTypes['SlimSubject'], ParentType, ContextType>;
  summary?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PersonRelatedSubjectResolvers<
  ContextType = Context,
  ParentType extends
    ResolversParentTypes['PersonRelatedSubject'] = ResolversParentTypes['PersonRelatedSubject'],
> = {
  position?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  subject?: Resolver<ResolversTypes['SlimSubject'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type QueryResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query'],
> = {
  character?: Resolver<
    Maybe<ResolversTypes['Character']>,
    ParentType,
    ContextType,
    RequireFields<QueryCharacterArgs, 'id'>
  >;
  me?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  person?: Resolver<
    Maybe<ResolversTypes['Person']>,
    ParentType,
    ContextType,
    RequireFields<QueryPersonArgs, 'id'>
  >;
  subject?: Resolver<
    Maybe<ResolversTypes['Subject']>,
    ParentType,
    ContextType,
    RequireFields<QuerySubjectArgs, 'id'>
  >;
};

export type SlimCharacterResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['SlimCharacter'] = ResolversParentTypes['SlimCharacter'],
> = {
  collects?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  comment?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  images?: Resolver<Maybe<ResolversTypes['Images']>, ParentType, ContextType>;
  infobox?: Resolver<Maybe<Array<ResolversTypes['Infobox']>>, ParentType, ContextType>;
  last_post?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  lock?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  nsfw?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  redirect?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  role?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  summary?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SlimPersonResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['SlimPerson'] = ResolversParentTypes['SlimPerson'],
> = {
  career?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  collects?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  comment?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  images?: Resolver<Maybe<ResolversTypes['Images']>, ParentType, ContextType>;
  infobox?: Resolver<Maybe<Array<ResolversTypes['Infobox']>>, ParentType, ContextType>;
  last_post?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  lock?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  nsfw?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  redirect?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  summary?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SlimSubjectResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['SlimSubject'] = ResolversParentTypes['SlimSubject'],
> = {
  airtime?: Resolver<ResolversTypes['SubjectAirtime'], ParentType, ContextType>;
  eps?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  images?: Resolver<Maybe<ResolversTypes['SubjectImages']>, ParentType, ContextType>;
  infobox?: Resolver<Maybe<Array<ResolversTypes['Infobox']>>, ParentType, ContextType>;
  locked?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  name_cn?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  nsfw?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  platform?: Resolver<ResolversTypes['SubjectPlatform'], ParentType, ContextType>;
  rating?: Resolver<ResolversTypes['SubjectRating'], ParentType, ContextType>;
  redirect?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  series?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  series_entry?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  summary?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  volumes?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SubjectResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['Subject'] = ResolversParentTypes['Subject'],
> = {
  airtime?: Resolver<ResolversTypes['SubjectAirtime'], ParentType, ContextType>;
  characters?: Resolver<
    Maybe<Array<ResolversTypes['SubjectRelatedCharacter']>>,
    ParentType,
    ContextType,
    RequireFields<SubjectCharactersArgs, 'limit' | 'offset'>
  >;
  collection?: Resolver<ResolversTypes['SubjectCollection'], ParentType, ContextType>;
  episodes?: Resolver<
    Maybe<Array<ResolversTypes['Episode']>>,
    ParentType,
    ContextType,
    RequireFields<SubjectEpisodesArgs, 'limit' | 'offset'>
  >;
  eps?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  images?: Resolver<Maybe<ResolversTypes['SubjectImages']>, ParentType, ContextType>;
  infobox?: Resolver<Maybe<Array<ResolversTypes['Infobox']>>, ParentType, ContextType>;
  locked?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  name_cn?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  nsfw?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  persons?: Resolver<
    Maybe<Array<ResolversTypes['SubjectRelatedPerson']>>,
    ParentType,
    ContextType,
    RequireFields<SubjectPersonsArgs, 'limit' | 'offset'>
  >;
  platform?: Resolver<ResolversTypes['SubjectPlatform'], ParentType, ContextType>;
  rating?: Resolver<ResolversTypes['SubjectRating'], ParentType, ContextType>;
  redirect?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  relations?: Resolver<
    Maybe<Array<ResolversTypes['SubjectRelation']>>,
    ParentType,
    ContextType,
    RequireFields<SubjectRelationsArgs, 'limit' | 'offset'>
  >;
  series?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  series_entry?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  summary?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tags?: Resolver<
    Array<ResolversTypes['SubjectTag']>,
    ParentType,
    ContextType,
    RequireFields<SubjectTagsArgs, 'limit'>
  >;
  topics?: Resolver<
    Maybe<Array<ResolversTypes['SubjectTopic']>>,
    ParentType,
    ContextType,
    RequireFields<SubjectTopicsArgs, 'limit' | 'offset'>
  >;
  type?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  volumes?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SubjectAirtimeResolvers<
  ContextType = Context,
  ParentType extends
    ResolversParentTypes['SubjectAirtime'] = ResolversParentTypes['SubjectAirtime'],
> = {
  date?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  month?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  weekday?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  year?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SubjectCollectionResolvers<
  ContextType = Context,
  ParentType extends
    ResolversParentTypes['SubjectCollection'] = ResolversParentTypes['SubjectCollection'],
> = {
  collect?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  doing?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  dropped?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  on_hold?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  wish?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SubjectImagesResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['SubjectImages'] = ResolversParentTypes['SubjectImages'],
> = {
  common?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  grid?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  large?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  medium?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  small?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SubjectPlatformResolvers<
  ContextType = Context,
  ParentType extends
    ResolversParentTypes['SubjectPlatform'] = ResolversParentTypes['SubjectPlatform'],
> = {
  alias?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type_cn?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SubjectRatingResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['SubjectRating'] = ResolversParentTypes['SubjectRating'],
> = {
  count?: Resolver<Maybe<Array<ResolversTypes['Int']>>, ParentType, ContextType>;
  rank?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  score?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  total?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SubjectRelatedCharacterResolvers<
  ContextType = Context,
  ParentType extends
    ResolversParentTypes['SubjectRelatedCharacter'] = ResolversParentTypes['SubjectRelatedCharacter'],
> = {
  character?: Resolver<ResolversTypes['SlimCharacter'], ParentType, ContextType>;
  order?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SubjectRelatedPersonResolvers<
  ContextType = Context,
  ParentType extends
    ResolversParentTypes['SubjectRelatedPerson'] = ResolversParentTypes['SubjectRelatedPerson'],
> = {
  person?: Resolver<ResolversTypes['SlimPerson'], ParentType, ContextType>;
  position?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SubjectRelationResolvers<
  ContextType = Context,
  ParentType extends
    ResolversParentTypes['SubjectRelation'] = ResolversParentTypes['SubjectRelation'],
> = {
  order?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  relation?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  subject?: Resolver<ResolversTypes['SlimSubject'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SubjectTagResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['SubjectTag'] = ResolversParentTypes['SubjectTag'],
> = {
  count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SubjectTopicResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['SubjectTopic'] = ResolversParentTypes['SubjectTopic'],
> = {
  created_at?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  creator?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  display?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  replies?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  state?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updated_at?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type UserResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User'],
> = {
  avatar?: Resolver<ResolversTypes['Avatar'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  nickname?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  username?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type Resolvers<ContextType = Context> = {
  Avatar?: AvatarResolvers<ContextType>;
  Character?: CharacterResolvers<ContextType>;
  CharacterRelatedPerson?: CharacterRelatedPersonResolvers<ContextType>;
  CharacterRelatedSubject?: CharacterRelatedSubjectResolvers<ContextType>;
  Episode?: EpisodeResolvers<ContextType>;
  Images?: ImagesResolvers<ContextType>;
  Infobox?: InfoboxResolvers<ContextType>;
  InfoboxValue?: InfoboxValueResolvers<ContextType>;
  Person?: PersonResolvers<ContextType>;
  PersonRelatedCharacter?: PersonRelatedCharacterResolvers<ContextType>;
  PersonRelatedSubject?: PersonRelatedSubjectResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  SlimCharacter?: SlimCharacterResolvers<ContextType>;
  SlimPerson?: SlimPersonResolvers<ContextType>;
  SlimSubject?: SlimSubjectResolvers<ContextType>;
  Subject?: SubjectResolvers<ContextType>;
  SubjectAirtime?: SubjectAirtimeResolvers<ContextType>;
  SubjectCollection?: SubjectCollectionResolvers<ContextType>;
  SubjectImages?: SubjectImagesResolvers<ContextType>;
  SubjectPlatform?: SubjectPlatformResolvers<ContextType>;
  SubjectRating?: SubjectRatingResolvers<ContextType>;
  SubjectRelatedCharacter?: SubjectRelatedCharacterResolvers<ContextType>;
  SubjectRelatedPerson?: SubjectRelatedPersonResolvers<ContextType>;
  SubjectRelation?: SubjectRelationResolvers<ContextType>;
  SubjectTag?: SubjectTagResolvers<ContextType>;
  SubjectTopic?: SubjectTopicResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
};
