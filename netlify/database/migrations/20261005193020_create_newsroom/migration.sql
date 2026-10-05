CREATE TABLE "articles" (
	"id" serial PRIMARY KEY,
	"title" text NOT NULL,
	"excerpt" text NOT NULL,
	"content" text NOT NULL,
	"category" text NOT NULL,
	"region" text NOT NULL,
	"author" text NOT NULL,
	"image" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_profiles" (
	"identity_id" text PRIMARY KEY,
	"username" text NOT NULL UNIQUE,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "articles_status_idx" ON "articles" ("status");
--> statement-breakpoint
INSERT INTO "articles" ("id", "title", "excerpt", "content", "category", "region", "author", "image", "status", "created_by", "updated_by", "published_at") VALUES (1, 'Pan-African Tech Alliances Fast-Track Cross-Border Digital Currencies & Connectivity', 'Key central banks and fintech hubs unite to construct unified payment networks, paving the way for frictionless trade under AfCFTA.', 'In an unprecedented leap forward for regional integration, financial authorities across Nairobi, Lagos, and Accra have formalized a joint protocol establishing real-time digital settlement networks. The agreement promises to lower cross-border transaction fees by over 60%, drastically simplifying commerce for small enterprises across the continent.

Unlocking the Power of AfCFTA

For decades, intra-African trade was hampered by costly multi-currency conversions routed through intermediary banking hubs in Europe or North America. By deploying interoperable digital payment bridges, African entrepreneurs can now settle trades instantaneously in local currencies.

"We are no longer just talking about economic integration on paper," stated Dr. Kojo Vance during the summit. "We are engineering the digital rails that allow a merchant in Dakar to receive payments seamlessly from a buyer in Kigali within seconds."', 'Tech & Innovation', 'East', 'Amina Mohamed', 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&w=800&q=80', 'published', 'legacy-newsroom', 'legacy-newsroom', '2026-10-05T00:00:00.000Z');
--> statement-breakpoint
INSERT INTO "articles" ("id", "title", "excerpt", "content", "category", "region", "author", "image", "status", "created_by", "updated_by", "published_at") VALUES (2, 'North Africa''s Solar Highway: How Giant Farms Are Powering Trans-Mediterranean Grids', 'Solar infrastructure expansions in Egypt and Morocco unlock clean export potential while supplying domestic industrial growth.', 'stretching across vast desert landscapes, North Africa''s mega solar installations are redefining global energy geography. With new submarine high-voltage cables coming online, renewable energy produced in the Sahara is directly powering green industrial zones and European cities.

Local manufacturing of PV modules and green hydrogen electrolyzers is rapidly growing, generating tens of thousands of skilled engineering jobs across the region.', 'Climate', 'North', 'Youssef El-Mansouri', 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80', 'published', 'legacy-newsroom', 'legacy-newsroom', '2026-10-04T00:00:00.000Z');
--> statement-breakpoint
INSERT INTO "articles" ("id", "title", "excerpt", "content", "category", "region", "author", "image", "status", "created_by", "updated_by", "published_at") VALUES (3, 'Democratic Reforms and Youth Voter Engagement Surge in West African Elections', 'Civic tech tools and grassroots mobilizations drive record youth registration numbers in upcoming parliamentary votes.', 'A new generation of voters across West Africa is leveraging open-source tracking tools to demand transparency, accountability, and candidate performance benchmarks.', 'Politics', 'West', 'Kwame Lawson', 'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?auto=format&fit=crop&w=800&q=80', 'published', 'legacy-newsroom', 'legacy-newsroom', '2026-10-03T00:00:00.000Z');
--> statement-breakpoint
INSERT INTO "articles" ("id", "title", "excerpt", "content", "category", "region", "author", "image", "status", "created_by", "updated_by", "published_at") VALUES (4, 'Afrobeats and Cinema Driving a $12B Creative Economy Boom', 'Global streaming distribution deals and creative incubators attract record venture capital into African entertainment.', 'From film festivals in Lagos to recording studios in Johannesburg, African storytellers are building self-sustaining global brands that command premium valuations.', 'Culture', 'West', 'Chioma Okereke', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80', 'published', 'legacy-newsroom', 'legacy-newsroom', '2026-10-02T00:00:00.000Z');
--> statement-breakpoint
INSERT INTO "articles" ("id", "title", "excerpt", "content", "category", "region", "author", "image", "status", "created_by", "updated_by", "published_at") VALUES (5, 'Southern Africa Lithium Refinery Hub Boosts Local Value Addition', 'New processing facilities ensure raw critical minerals are converted into battery-grade materials locally before export.', 'By shifting from raw ore exports to refined lithium production, regional economies are securing significantly higher profit margins and industrial capabilities.', 'Business', 'Southern', 'Thabo Mbeki Jr.', 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80', 'published', 'legacy-newsroom', 'legacy-newsroom', '2026-10-01T00:00:00.000Z');
--> statement-breakpoint
INSERT INTO "articles" ("id", "title", "excerpt", "content", "category", "region", "author", "image", "status", "created_by", "updated_by", "published_at") VALUES (6, 'Central Africa Basin Conservation: Balancing Forest Protection and Economic Growth', 'High-integrity carbon credit frameworks reward rainforest stewardship while funding sustainable community development.', 'The Congo Basin rainforest remains the earth''s vital green heart. Innovative sovereign climate bonds are now directly compensating local stewards.', 'Climate', 'Central', 'Marie-Claire Ndombe', 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=800&q=80', 'published', 'legacy-newsroom', 'legacy-newsroom', '2026-09-29T00:00:00.000Z');
--> statement-breakpoint
SELECT setval(pg_get_serial_sequence('articles', 'id'), (SELECT max(id) FROM articles));
