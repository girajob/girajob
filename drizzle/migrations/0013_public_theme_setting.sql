GRANT SELECT ON public.platform_settings TO anon;
CREATE POLICY "theme readable by visitors" ON public.platform_settings FOR SELECT TO anon USING (key = 'theme');