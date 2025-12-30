import { Separator } from "@/frontend/components/ui/separator";
import { Facebook, Instagram, Youtube } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/frontend/components/ui/dialog";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/frontend/components/ui/accordion";
import { Link } from "react-router";

export default function Footer() {
  return (
    <footer className="w-full bg-[#02050A] text-white py-10 px-6 md:px-16 lg:px-24">
      {/* Top Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
        {/* Left Section */}
        <div>
          <h2 className="text-4xl font-bold leading-tight mb-2">
            We'll Be Happy <br /> to Help!
          </h2>
        </div>

        {/* Links */}
        <div className="grid grid-cols-2 gap-12">
          <div>
            <ul className="space-y-3">
              {/* Refund Policy Modal */}
              <li>
                <Dialog>
                  <DialogTrigger className="cursor-pointer text-sm md:text-base">
                    Refund Policy
                  </DialogTrigger>

                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Refund Policy</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6 text-sm text-muted-foreground">
                      {/* Intro paragraph */}
                      <p>
                        At MyEternalGuide, our goal is to provide seekers with
                        authentic, vedic scripture-based spiritual guidance.
                        Since this service involves personalized digital
                        content, we have a limited refund policy. Please read
                        the conditions below carefully before making a purchase.
                      </p>

                      {/* Accordion Content */}
                      <Accordion
                        type="single"
                        collapsible
                        className="w-full space-y-2"
                      >
                        <AccordionItem value="item-1">
                          <AccordionTrigger>
                            1. Can I cancel my subscription anytime?
                          </AccordionTrigger>
                          <AccordionContent>
                            Yes. You can cancel your subscription at any time
                            from your account settings. Once cancelled, you will
                            continue to have access until the end of your
                            billing cycle.
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-2">
                          <AccordionTrigger>
                            2. Do I get a refund if I cancel in the middle of a
                            billing cycle?
                          </AccordionTrigger>
                          <AccordionContent>
                            No. Since guidance is provided instantly and
                            on-demand, partial refunds are not available. Your
                            access will remain active until your current cycle
                            ends.
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-3">
                          <AccordionTrigger>
                            3. What happens if I forget to cancel my
                            subscription?
                          </AccordionTrigger>
                          <AccordionContent>
                            Your subscription will auto-renew at the end of each
                            billing period. If you intended to cancel but
                            forgot, you can request a refund within 7 days of
                            the renewal charge. Beyond that, refunds will not be
                            possible.
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-4">
                          <AccordionTrigger>
                            4. What if I’m charged twice by mistake?
                          </AccordionTrigger>
                          <AccordionContent>
                            In the rare case of duplicate payment, we will issue
                            a full refund for the duplicate transaction.
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-5">
                          <AccordionTrigger>
                            5. What if I cannot access my answers or the
                            platform after payment?
                          </AccordionTrigger>
                          <AccordionContent>
                            If you face technical issues that prevent you from
                            receiving your guidance, please share screenshots
                            with support@myeternalguide.com. Once verified, you
                            will receive extended access.
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-6">
                          <AccordionTrigger>
                            6. Are refunds available if I don’t like the
                            answers?
                          </AccordionTrigger>
                          <AccordionContent>
                            No. All answers are scripture-rooted and not
                            personalized opinions. Dissatisfaction with the
                            content of the answer is not a valid reason for
                            refund.
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-7">
                          <AccordionTrigger>
                            7. How do I request a refund?
                          </AccordionTrigger>
                          <AccordionContent>
                            Please email support@myeternalguide.com with your
                            order ID, date of purchase and a short description
                            of the issue. Our team will review and respond
                            promptly.
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  </DialogContent>
                </Dialog>
              </li>

              {/* Privacy Policy Modal */}
              <li>
                <Dialog>
                  <DialogTrigger className="cursor-pointer text-sm md:text-base">
                    Privacy Policy
                  </DialogTrigger>

                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Privacy Policy</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6 text-sm text-muted-foreground">
                      {/* Effective Date */}
                      <p className="text-xs text-muted-foreground">
                        <strong>Effective Date:</strong> September 22, 2025
                      </p>

                      {/* Intro */}
                      <p>
                        Ripple Digital Pvt. Ltd. (“Company,” “we,” “us,” or
                        “our”), based in Mumbai, India, operates the website{" "}
                        <strong>www.myeternalguide.com</strong>
                        (“Website”). This Privacy Policy explains how we
                        collect, use, disclose and safeguard your information
                        when you use our services.
                      </p>

                      {/* Accordion Sections */}
                      <Accordion
                        type="single"
                        collapsible
                        className="w-full space-y-2"
                      >
                        <AccordionItem value="p1">
                          <AccordionTrigger>
                            1. Information We Collect
                          </AccordionTrigger>
                          <AccordionContent>
                            <ul className="list-disc pl-5 space-y-1">
                              <li>
                                <strong>Personal Information:</strong> Name,
                                email address, billing details, subscription
                                data.
                              </li>
                              <li>
                                <strong>User Content:</strong> Questions
                                submitted and scripture-based responses
                                generated.
                              </li>
                              <li>
                                <strong>Technical Information:</strong> IP
                                address, browser type, device identifiers and
                                cookies.
                              </li>
                            </ul>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="p2">
                          <AccordionTrigger>
                            2. How We Use Your Information
                          </AccordionTrigger>
                          <AccordionContent>
                            <ul className="list-disc pl-5 space-y-1">
                              <li>
                                To provide personalized spiritual guidance based
                                on Vedic scriptures.
                              </li>
                              <li>
                                To manage subscriptions, payments and customer
                                support.
                              </li>
                              <li>
                                To improve our platform, monitor usage and
                                enhance user experience.
                              </li>
                              <li>
                                To comply with legal and regulatory obligations.
                              </li>
                            </ul>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="p3">
                          <AccordionTrigger>
                            3. Sharing of Information
                          </AccordionTrigger>
                          <AccordionContent>
                            <ul className="list-disc pl-5 space-y-1">
                              <li>We do not sell or rent personal data.</li>
                              <li>
                                Data may be shared with trusted third-party
                                service providers (e.g., payment gateways,
                                hosting providers).
                              </li>
                              <li>
                                Disclosure may occur when required by law or to
                                protect our rights.
                              </li>
                            </ul>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="p4">
                          <AccordionTrigger>
                            4. Confidentiality of Questions & Answers
                          </AccordionTrigger>
                          <AccordionContent>
                            <p>
                              All user questions and responses remain private
                              and are not shared publicly. Aggregated or
                              anonymized insights may be used to improve
                              services.
                            </p>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="p5">
                          <AccordionTrigger>
                            5. Data Protection & Retention
                          </AccordionTrigger>
                          <AccordionContent>
                            <ul className="list-disc pl-5 space-y-1">
                              <li>
                                We use industry-standard measures to protect
                                user data.
                              </li>
                              <li>
                                Data is retained only as long as necessary for
                                service provision or legal compliance.
                              </li>
                            </ul>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="p6">
                          <AccordionTrigger>
                            6. International Users
                          </AccordionTrigger>
                          <AccordionContent>
                            <p>
                              If you access our website from outside India, your
                              data may be transferred to and processed in India.
                              By using our services, you consent to such
                              transfer.
                            </p>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="p7">
                          <AccordionTrigger>
                            7. Children’s Privacy
                          </AccordionTrigger>
                          <AccordionContent>
                            <p>
                              Users between 13 and 18 may access the platform
                              only with parental/guardian consent. The platform
                              is not intended for children under 13.
                            </p>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="p8">
                          <AccordionTrigger>8. Your Rights</AccordionTrigger>
                          <AccordionContent>
                            <p>
                              Depending on your jurisdiction (e.g., GDPR/CCPA),
                              you may have rights to access, correct, delete or
                              restrict use of your personal data. Requests can
                              be sent to
                              <strong> support@myeternalguide.com</strong>.
                            </p>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="p9">
                          <AccordionTrigger>
                            9. Changes to This Policy
                          </AccordionTrigger>
                          <AccordionContent>
                            <p>
                              We may update this policy from time to time.
                              Continued use constitutes acceptance of updates.
                            </p>
                          </AccordionContent>
                        </AccordionItem>

                        {/* Disclaimer Section */}
                        <AccordionItem value="p10">
                          <AccordionTrigger>Disclaimer</AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-3">
                              <p>
                                MyEternalGuide is a spiritual guidance platform
                                based on authentic Vedic scriptures (e.g.,
                                Bhagavad Gita, Srimad Bhagavatam, Ramayana,
                                Mahabharata, Upanishads).
                              </p>
                              <p>
                                Content provided is for informational and
                                spiritual purposes only. It does not constitute
                                medical, psychological, financial or legal
                                advice.
                              </p>
                              <p>
                                Users are solely responsible for how they
                                interpret and apply the guidance.
                              </p>
                              <p>
                                Ripple Digital Pvt. Ltd., its directors,
                                employees, or affiliates shall not be held
                                liable for:
                              </p>
                              <ul className="list-disc pl-5 space-y-1">
                                <li>
                                  Decisions made based on the content provided.
                                </li>
                                <li>
                                  Emotional, psychological or financial outcomes
                                  of following the guidance.
                                </li>
                                <li>
                                  Dissatisfaction with answers, as all answers
                                  are scripture-rooted.
                                </li>
                              </ul>
                              <p>
                                If you are experiencing depression, anxiety or
                                suicidal thoughts, please seek immediate help
                                from a qualified mental health professional or
                                contact a local helpline. Our platform is not a
                                substitute for professional care.
                              </p>
                              <p>
                                <strong>
                                  By using MyEternalGuide, you agree to this
                                  disclaimer.
                                </strong>
                              </p>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  </DialogContent>
                </Dialog>
              </li>

              {/* Terms & Conditions Modal */}
              <li>
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="cursor-pointer text-sm md:text-base">
                      Terms & Conditions
                    </button>
                  </DialogTrigger>

                  <DialogContent className="max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Terms & Conditions</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6 text-sm leading-relaxed">
                      <p>
                        <strong>Effective Date:</strong> September 22, 2025
                      </p>

                      <p>
                        Welcome to MyEternalGuide, a digital platform operated
                        by Ripple Digital Pvt. Ltd. (“Company,” “we,” “us”).
                        These Terms govern your use of the website
                        <strong> www.myeternalguide.com </strong> and associated
                        services.
                      </p>

                      <h3 className="font-semibold text-base">
                        1. Acceptance of Terms
                      </h3>
                      <p>
                        By using our platform, you agree to these Terms. If you
                        do not agree, do not use the Website.
                      </p>

                      <h3 className="font-semibold text-base">
                        2. Eligibility
                      </h3>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Users must be 18 years or older.</li>
                        <li>
                          Users aged 13–18 may use the platform only with
                          parental/guardian consent.
                        </li>
                        <li>The service is not available to users under 13.</li>
                      </ul>

                      <h3 className="font-semibold text-base">
                        3. Nature of Services
                      </h3>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>
                          The platform provides scripture-based spiritual
                          guidance.
                        </li>
                        <li>
                          There are no “right” or “wrong” answers, as content is
                          rooted in Vedic texts.
                        </li>
                        <li>
                          The platform does not guarantee specific outcomes or
                          problem resolution.
                        </li>
                      </ul>

                      <h3 className="font-semibold text-base">
                        4. Subscriptions, Billing & Refunds
                      </h3>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>
                          Subscription plans: ₹650/month or ₹2,999/year or
                          ₹5,999/year.
                        </li>
                        <li>
                          Pricing is subject to change with notice for future
                          billing cycles.
                        </li>
                        <li>
                          Users receive 3 free questions before subscribing.
                        </li>
                        <li>
                          Refund policy: As detailed in our Refund Policy. No
                          refunds for dissatisfaction with answers. Duplicate
                          charges and technical access issues are covered.
                        </li>
                      </ul>

                      <h3 className="font-semibold text-base">
                        5. Intellectual Property
                      </h3>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>
                          All content, text, design and software are the
                          intellectual property of Ripple Digital Pvt. Ltd.
                        </li>
                        <li>
                          Users may not copy, modify or redistribute content
                          without prior written consent.
                        </li>
                      </ul>

                      <h3 className="font-semibold text-base">
                        6. User Responsibilities
                      </h3>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>
                          Users agree not to misuse the platform or submit
                          unlawful content.
                        </li>
                        <li>
                          Users are responsible for maintaining confidentiality
                          of their account details.
                        </li>
                      </ul>

                      <h3 className="font-semibold text-base">
                        7. Limitation of Liability
                      </h3>
                      <p>
                        Ripple Digital Pvt. Ltd. shall not be liable for direct,
                        indirect, incidental or consequential damages arising
                        from use of the platform.
                      </p>

                      <h3 className="font-semibold text-base">
                        8. Governing Law & Jurisdiction
                      </h3>
                      <p>
                        These Terms are governed by the laws of India.
                        Jurisdiction lies exclusively with the courts of Mumbai,
                        Maharashtra.
                      </p>

                      <h3 className="font-semibold text-base">
                        9. Modifications
                      </h3>
                      <p>
                        We may revise these Terms at any time. Continued use
                        constitutes acceptance of the updated Terms.
                      </p>
                    </div>
                  </DialogContent>
                </Dialog>
              </li>

              {/* Contact Us */}
              <li>
                <Link to="/contact" className="text-sm md:text-base">Contact Us</Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Contact Section */}
        <div>
          <h3 className="font-semibold text-lg mb-4">Say Hello</h3>

          <p className="mb-2">
            <a href="mailto:support@myeternalguide.com">
              support@myeternalguide.com
            </a>
          </p>

          <p className="text-white/80 mb-6">+91 98200 34220</p>

          <div className="flex items-center gap-6">
            <a className="border rounded-full p-3">
              <Facebook className="w-5 h-5 text-white/80 hover:text-white transition" />
            </a>
            <a className="border rounded-full p-3">
              <Instagram className="w-5 h-5 text-white/80 hover:text-white transition" />
            </a>
            <a className="border rounded-full p-3">
              <Youtube className="w-5 h-5 text-white/80 hover:text-white transition" />
            </a>
          </div>
        </div>
      </div>

      {/* Bottom Divider */}
      <Separator className="my-6 bg-white/20" />

      {/* Footer Bottom */}
      <p className="text-sm">
        My Eternal Guide © 2025. All Rights Reserved.
      </p>
    </footer>
  );
}
